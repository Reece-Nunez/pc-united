import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { sendSms } from '@/lib/sms';
import { buildReminderItems, recipientsFor, ParentLinkRow } from '@/lib/reminders';
import { CLUB_TIME_ZONE } from '@/lib/time';
import type { Event, Schedule, Team } from '@/lib/supabase';

export const runtime = 'nodejs';
// Never cache — the cron must see today's data on every run.
export const dynamic = 'force-dynamic';

// Today's date (YYYY-MM-DD) in the club's timezone — event/game timestamps are
// stored as club wall-clock strings (see lib/time.ts), so a string prefix
// range covers exactly one club day.
function clubToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`); // noon UTC dodges DST edge cases
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// GET: invoked by Vercel Cron each morning (see vercel.json). Sends one SMS
// per (practice/game today) × (approved parent on that team), skipping any
// phone already logged for that item+day.
export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const today = clubToday();
    const dayStart = `${today}T00:00:00`;
    const dayEnd = `${nextDay(today)}T00:00:00`;

    const [eventsRes, gamesRes, teamsRes, linksRes, logRes] = await Promise.all([
      admin.from('events').select('*').eq('event_type', 'practice').gte('event_date', dayStart).lt('event_date', dayEnd),
      admin.from('schedule').select('*').eq('status', 'scheduled').gte('game_date', dayStart).lt('game_date', dayEnd),
      admin.from('teams').select('id, name'),
      admin.from('parent_children').select('parent_phone, status, players(team_id)').eq('status', 'approved'),
      admin.from('sms_reminder_log').select('item_kind, item_id, phone').eq('remind_date', today),
    ]);
    const firstError = [eventsRes, gamesRes, teamsRes, linksRes, logRes].find(r => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const items = buildReminderItems(
      (eventsRes.data || []) as Event[],
      (gamesRes.data || []) as Schedule[],
      (teamsRes.data || []) as Team[],
      today,
    );
    const links = (linksRes.data || []) as unknown as ParentLinkRow[];
    const alreadySent = new Set((logRes.data || []).map(r => `${r.item_kind}:${r.item_id}:${r.phone}`));

    let sent = 0, skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      for (const phone of recipientsFor(item, links)) {
        const key = `${item.kind}:${item.id}:${phone}`;
        if (alreadySent.has(key)) { skipped++; continue; }
        try {
          const { sid } = await sendSms(phone, item.message);
          alreadySent.add(key);
          sent++;
          const { error: logError } = await admin.from('sms_reminder_log').insert({
            item_kind: item.kind, item_id: item.id, remind_date: today, phone, sid,
          });
          if (logError) errors.push(`log ${key}: ${logError.message}`);
        } catch (err: any) {
          errors.push(`send ${key}: ${err?.message || 'unknown error'}`);
        }
      }
    }

    return NextResponse.json({ ok: true, date: today, items: items.length, sent, skipped, errors });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Reminder run failed' }, { status: 500 });
  }
}
