import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { sendSms, toE164 } from '@/lib/sms';
import {
  buildCoachDigests, clubWallClockNow, wallClockPlusMinutes,
  RosterPlayer, AttendanceRow,
} from '@/lib/reminders';
import type { Event, Schedule, Team } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: invoked hourly by Vercel Cron (see vercel.json). For any practice/game
// starting within the next 2 hours (club time), text every active coach the
// RSVP breakdown. The sms_reminder_log unique key (digest kinds) means each
// coach gets at most one digest per item even though the window spans two runs.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const now = clubWallClockNow();
    const windowEnd = wallClockPlusMinutes(now, 120);
    const today = now.slice(0, 10);

    const [eventsRes, gamesRes, teamsRes, playersRes, coachesRes] = await Promise.all([
      admin.from('events').select('*').eq('event_type', 'practice').gt('event_date', now).lte('event_date', windowEnd),
      admin.from('schedule').select('*').eq('status', 'scheduled').gt('game_date', now).lte('game_date', windowEnd),
      admin.from('teams').select('id, name'),
      admin.from('players').select('id, name, team_id'),
      admin.from('coaches').select('name, phone, active').eq('active', true),
    ]);
    const firstError = [eventsRes, gamesRes, teamsRes, playersRes, coachesRes].find(r => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const events = (eventsRes.data || []) as Event[];
    const games = (gamesRes.data || []) as Schedule[];
    if (!events.length && !games.length) {
      return NextResponse.json({ ok: true, date: today, digests: 0, sent: 0, skipped: 0 });
    }

    // Attendance rows only for the items in the window.
    const eventIds = events.map(e => e.id);
    const gameIds = games.map(g => g.id);
    let attendance: AttendanceRow[] = [];
    {
      const ors: string[] = [];
      if (eventIds.length) ors.push(`event_id.in.(${eventIds.join(',')})`);
      if (gameIds.length) ors.push(`schedule_id.in.(${gameIds.join(',')})`);
      const { data, error } = await admin
        .from('event_attendance')
        .select('event_id, schedule_id, player_id, rsvp')
        .or(ors.join(','));
      if (error) throw new Error(error.message);
      attendance = (data || []) as AttendanceRow[];
    }

    const digests = buildCoachDigests(
      events, games,
      (teamsRes.data || []) as Team[],
      (playersRes.data || []) as RosterPlayer[],
      attendance,
      now,
    );

    const coachPhones = [...new Set(
      (coachesRes.data || []).map((c: any) => toE164(c.phone || '')).filter(Boolean) as string[],
    )];

    // Already-sent guard, same log table as the parent reminders but under
    // digest_* kinds so the two flows can't collide.
    const { data: logRows, error: logError } = await admin
      .from('sms_reminder_log')
      .select('item_kind, item_id, phone')
      .eq('remind_date', today)
      .in('item_kind', ['digest_event', 'digest_game']);
    if (logError) throw new Error(logError.message);
    const alreadySent = new Set((logRows || []).map(r => `${r.item_kind}:${r.item_id}:${r.phone}`));

    let sent = 0, skipped = 0;
    const errors: string[] = [];
    for (const d of digests) {
      const logKind = d.kind === 'event' ? 'digest_event' : 'digest_game';
      for (const phone of coachPhones) {
        const key = `${logKind}:${d.id}:${phone}`;
        if (alreadySent.has(key)) { skipped++; continue; }
        try {
          const { sid } = await sendSms(phone, d.message);
          alreadySent.add(key);
          sent++;
          const { error: insertError } = await admin.from('sms_reminder_log').insert({
            item_kind: logKind, item_id: d.id, remind_date: today, phone, sid,
          });
          if (insertError) errors.push(`log ${key}: ${insertError.message}`);
        } catch (err: any) {
          errors.push(`send ${key}: ${err?.message || 'unknown error'}`);
        }
      }
    }

    return NextResponse.json({ ok: true, date: today, digests: digests.length, sent, skipped, errors });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Coach digest run failed' }, { status: 500 });
  }
}
