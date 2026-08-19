import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { listCalendarEvents } from '@/lib/groupme-calendar';
import { buildAttendanceRows, DRAFT_MARKER } from '@/lib/groupme-rsvp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pulls RSVPs off the GroupMe calendar events we published and records them as
 * event_attendance rows.
 *
 * Runs hourly: GroupMe has no webhook for RSVP changes, so polling is the only
 * option, and a parent tapping "I'm in" an hour before a game should still be
 * counted.
 *
 * Writes `rsvp` (parent intent) always. It also drafts `attendance` = 'present'
 * for a "going", marked `groupme:auto` so the coach can see it is unreviewed —
 * playing-time decisions should rest on a coach confirming who actually showed,
 * not on who tapped a button. A row the coach has already marked is never
 * overwritten.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.GROUPME_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: true, skipped: 'GROUPME_ACCESS_TOKEN not configured' });

  try {
    const admin = getAdminClient();

    const [syncRes, mapRes, linksRes, playersRes] = await Promise.all([
      admin.from('groupme_calendar_sync').select('*').eq('state', 'active'),
      admin.from('groupme_member_map').select('*'),
      admin.from('parent_children').select('parent_user_id, parent_name, player_id, status'),
      admin.from('players').select('id, name, team_id, status'),
    ]);
    const firstError = [syncRes, mapRes, linksRes, playersRes].find(r => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const memberMap = (mapRes.data || []) as any[];
    if (memberMap.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'no GroupMe members linked yet' });
    }
    const links = (linksRes.data || []) as any[];
    const players = ((playersRes.data || []) as any[]).filter(p => !p.status || p.status === 'active');

    // One GroupMe fetch per group, not per event.
    const byGroup = new Map<string, any[]>();
    for (const row of syncRes.data || []) {
      if (!byGroup.has(row.group_id)) byGroup.set(row.group_id, await listCalendarEvents(row.group_id, token));
    }

    let written = 0, skippedCoachMarked = 0, unmapped = 0;
    const errors: string[] = [];

    for (const row of syncRes.data || []) {
      const gmEvent = (byGroup.get(row.group_id) || []).find((e: any) => e.event_id === row.groupme_event_id);
      if (!gmEvent) continue;

      const teamId = row.bot_key === 'all' ? null : Number(row.bot_key);
      const rows = buildAttendanceRows(
        { going: gmEvent.going || [], maybe_going: gmEvent.maybe_going || [], not_going: gmEvent.not_going || [] },
        memberMap, links, players,
        {
          eventId: row.item_kind === 'event' ? row.item_id : null,
          scheduleId: row.item_kind === 'game' ? row.item_id : null,
          teamId,
        },
      );

      const responded = (gmEvent.going?.length || 0) + (gmEvent.maybe_going?.length || 0) + (gmEvent.not_going?.length || 0);
      if (responded > 0 && rows.length === 0) unmapped++;

      for (const r of rows) {
        try {
          // Never overwrite what a coach recorded. Their mark is the record;
          // ours is only a draft until they confirm it.
          const base = admin.from('event_attendance')
            .select('id, attendance, marked_by')
            .eq('player_id', r.player_id);
          const { data: existing } = r.event_id !== null
            ? await base.eq('event_id', r.event_id).maybeSingle()
            : await base.eq('schedule_id', r.schedule_id!).maybeSingle();

          const coachMarked = existing?.attendance && existing.marked_by && existing.marked_by !== DRAFT_MARKER;
          const payload: any = {
            event_id: r.event_id, schedule_id: r.schedule_id, player_id: r.player_id,
            rsvp: r.rsvp, rsvp_by: r.rsvp_by, updated_at: new Date().toISOString(),
          };
          if (!coachMarked && r.attendance) {
            payload.attendance = r.attendance;
            payload.marked_by = r.marked_by;
          } else if (coachMarked) {
            skippedCoachMarked++;
          }

          const { error } = await admin.from('event_attendance')
            .upsert(payload, { onConflict: 'event_id,schedule_id,player_id' });
          if (error) errors.push(`player ${r.player_id}: ${error.message}`);
          else written++;
        } catch (err: any) {
          errors.push(`player ${r.player_id}: ${err?.message || 'unknown error'}`);
        }
      }
    }

    return NextResponse.json({ ok: true, written, skippedCoachMarked, eventsWithUnmappedResponders: unmapped, errors });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'RSVP sync failed' }, { status: 500 });
  }
}
