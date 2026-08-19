import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { parseTeamBots, targetsForItem } from '@/lib/groupme';
import {
  gameToItem, eventToItem, buildCalendarEvent, calendarContentHash, isWithinWindow,
  createCalendarEvent, updateCalendarEvent, DEFAULT_WINDOW_DAYS, type CalendarItem,
} from '@/lib/groupme-calendar';
import { CLUB_TIME_ZONE } from '@/lib/time';
import type { Event, Schedule, Team } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clubToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/**
 * Publishes the admin calendar into each team's GroupMe calendar, on a rolling
 * window (default 7 days ahead — see GROUPME_CALENDAR_WINDOW_DAYS).
 *
 * A whole season published at once buries the calendar and makes RSVPs
 * meaningless; a week gives families time to answer while the daily message
 * reminders still fire the night before and the morning of. Those are separate
 * crons and are untouched by this one.
 *
 * Runs daily. Each pass:
 *   - creates a GroupMe event for anything newly inside the window
 *   - updates one whose details changed (content hash differs)
 *   - marks one cancelled when the fixture is cancelled or postponed
 *
 * Needs GROUPME_ACCESS_TOKEN (a *user* token — the bot token cannot touch the
 * calendar). See the warning at the top of lib/groupme-calendar.ts.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.GROUPME_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: true, skipped: 'GROUPME_ACCESS_TOKEN not configured' });

  const targets = parseTeamBots(process.env.GROUPME_TEAM_BOTS).filter(t => t.groupId);
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no groups with a group id configured' });
  }

  const windowDays = Number(process.env.GROUPME_CALENDAR_WINDOW_DAYS) || DEFAULT_WINDOW_DAYS;

  try {
    const admin = getAdminClient();
    const today = clubToday();

    const [gamesRes, eventsRes, teamsRes, syncRes] = await Promise.all([
      admin.from('schedule').select('*').gte('game_date', today),
      admin.from('events').select('*').gte('event_date', today),
      admin.from('teams').select('id, name'),
      admin.from('groupme_calendar_sync').select('*'),
    ]);
    const firstError = [gamesRes, eventsRes, teamsRes, syncRes].find(r => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const teams = (teamsRes.data || []) as Team[];
    const items: CalendarItem[] = [
      // Completed games are history — nothing to publish.
      ...((gamesRes.data || []) as Schedule[])
        .filter(g => g.status !== 'completed')
        .map(g => gameToItem(g, teams)),
      ...((eventsRes.data || []) as Event[]).map(e => eventToItem(e, teams)),
    ].filter(i => isWithinWindow(i.startsAt, today, windowDays));

    const synced = new Map<string, any>();
    for (const row of syncRes.data || []) synced.set(`${row.item_kind}:${row.item_id}:${row.bot_key}`, row);

    let created = 0, updated = 0, cancelled = 0, unchanged = 0;
    const errors: string[] = [];

    for (const item of items) {
      for (const target of targetsForItem(targets, item.teamId)) {
        const key = `${item.kind}:${item.id}:${target.key}`;
        const existing = synced.get(key);
        const payload = buildCalendarEvent(item);
        const hash = calendarContentHash(payload);

        try {
          if (!existing) {
            // Don't publish something that is already cancelled — an event that
            // appears only to say it is off is pure noise.
            if (item.cancelled) continue;
            const eventId = await createCalendarEvent(target.groupId!, token, payload);
            await admin.from('groupme_calendar_sync').insert({
              item_kind: item.kind, item_id: item.id, bot_key: target.key,
              group_id: target.groupId, groupme_event_id: eventId,
              content_hash: hash, state: 'active',
            });
            created++;
            continue;
          }

          if (existing.content_hash === hash && existing.state === (item.cancelled ? 'cancelled' : 'active')) {
            unchanged++;
            continue;
          }

          await updateCalendarEvent(existing.group_id, token, existing.groupme_event_id, payload);
          await admin.from('groupme_calendar_sync').update({
            content_hash: hash,
            state: item.cancelled ? 'cancelled' : 'active',
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
          if (item.cancelled) cancelled++; else updated++;
        } catch (err: any) {
          errors.push(`${key}: ${err?.message || 'unknown error'}`);
        }
      }
    }

    return NextResponse.json({
      ok: true, date: today, windowDays, inWindow: items.length,
      created, updated, cancelled, unchanged, errors,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Calendar sync failed' }, { status: 500 });
  }
}
