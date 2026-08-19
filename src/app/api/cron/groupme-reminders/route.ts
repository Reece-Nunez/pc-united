import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { buildGroupMeItems } from '@/lib/reminders';
import { parseTeamBots, targetsForItem } from '@/lib/groupme';
import { postAndLog } from '@/lib/groupme-log';
import { CLUB_TIME_ZONE } from '@/lib/time';
import type { Event, Schedule, Team } from '@/lib/supabase';

export const runtime = 'nodejs';
// Never cache — the cron must see today's data on every run.
export const dynamic = 'force-dynamic';

/** Club-timezone day (YYYY-MM-DD), offset by `addDays`. */
function clubDay(addDays = 0): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  if (addDays === 0) return today;
  const d = new Date(`${today}T12:00:00Z`); // noon UTC dodges DST edge cases
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Posts practice/game/tournament/meeting/social reminders into each team's
 * GroupMe group. Invoked twice daily by Vercel Cron (see vercel.json):
 *
 *   ?phase=evening — announces TOMORROW, so families can plan the night before
 *   ?phase=morning — announces TODAY
 *
 * Kept separate from /api/cron/reminders (the SMS run) rather than bolted onto
 * it: that route is working and carrier-compliant, and GroupMe needs different
 * wording, a wider set of event types, and its own idempotency key.
 */
export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const phase = request.nextUrl.searchParams.get('phase') === 'evening' ? 'evening' : 'morning';
  const targets = parseTeamBots(process.env.GROUPME_TEAM_BOTS);
  if (targets.length === 0) {
    // Not an error: the club may not have wired GroupMe up yet. Say so plainly
    // rather than reporting a successful run that posted nothing.
    return NextResponse.json({ ok: true, skipped: 'GROUPME_TEAM_BOTS not configured' });
  }

  try {
    const admin = getAdminClient();
    // Evening run looks at tomorrow; morning run at today.
    const remindDate = phase === 'evening' ? clubDay(1) : clubDay(0);
    const dayStart = `${remindDate}T00:00:00`;
    const dayEnd = `${clubDayAfter(remindDate)}T00:00:00`;

    const [eventsRes, gamesRes, teamsRes, logRes] = await Promise.all([
      admin.from('events').select('*').gte('event_date', dayStart).lt('event_date', dayEnd),
      admin.from('schedule').select('*').eq('status', 'scheduled').gte('game_date', dayStart).lt('game_date', dayEnd),
      admin.from('teams').select('id, name'),
      admin.from('groupme_reminder_log').select('item_kind, item_id, bot_key').eq('remind_date', remindDate).eq('phase', phase),
    ]);
    const firstError = [eventsRes, gamesRes, teamsRes, logRes].find(r => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const items = buildGroupMeItems(
      (eventsRes.data || []) as Event[],
      (gamesRes.data || []) as Schedule[],
      (teamsRes.data || []) as Team[],
      remindDate,
      phase === 'evening' ? 'tomorrow' : 'today',
    );
    const alreadySent = new Set((logRes.data || []).map(r => `${r.item_kind}:${r.item_id}:${r.bot_key}`));

    let posted = 0, skipped = 0, unrouted = 0;
    const errors: string[] = [];

    for (const item of items) {
      const itemTargets = targetsForItem(targets, item.teamId);
      // A team with no configured group reaches nobody. Report it rather than
      // counting a silent no-op as success.
      if (itemTargets.length === 0) { unrouted++; continue; }

      for (const target of itemTargets) {
        const key = `${item.kind}:${item.id}:${target.key}`;
        if (alreadySent.has(key)) { skipped++; continue; }

        const ok = await postAndLog({
          admin, target, message: item.message, kind: 'reminder', itemKind: item.kind, itemId: item.id,
        });
        if (!ok) { errors.push(`post ${key}: GroupMe rejected the message`); continue; }

        alreadySent.add(key);
        posted++;
        // Logged after a confirmed post, so a failed send is retried next run
        // rather than being marked delivered.
        const { error: logError } = await admin.from('groupme_reminder_log').insert({
          item_kind: item.kind, item_id: item.id, remind_date: remindDate, phase, bot_key: target.key,
        });
        if (logError) errors.push(`log ${key}: ${logError.message}`);
      }
    }

    return NextResponse.json({ ok: true, phase, date: remindDate, items: items.length, posted, skipped, unrouted, errors });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'GroupMe reminder run failed' }, { status: 500 });
  }
}

function clubDayAfter(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
