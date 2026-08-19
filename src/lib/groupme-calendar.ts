// Sync of the admin calendar into each team's GroupMe calendar.
//
// ⚠ UNDOCUMENTED API. dev.groupme.com documents groups, messages and bots only.
// The event endpoints below were found by probing and are not supported or
// versioned by GroupMe; they can change or disappear without notice. Verified
// working as of Aug 2026:
//
//   GET  /v3/conversations/:id/events/list     → 200
//   POST /v3/conversations/:id/events/create   → 400 "name is required" (validates)
//   POST /v3/conversations/:id/events/update   → reaches their datastore
//
// There is NO delete: every path shape tried (events/delete, events/destroy,
// DELETE /events/:id, /events/:id/delete, events/cancel) returns a generic 500,
// while update returns structured JSON errors. So a removed or cancelled fixture
// is renamed to mark it cancelled — see `cancelledName`. That also leaves the
// event visible to anyone who already RSVP'd instead of silently vanishing.
//
// Unlike bot posting, these calls need a *user* access token
// (GROUPME_ACCESS_TOKEN), which can read every group and DM on that account.
// Keep it server-side only.

import { CLUB_TIME_ZONE } from './time';
import { formatWallClockTime } from './reminders';
import { splitLocation, formatWallClockDate } from './groupme-commands';
import type { Schedule, Event, Team } from '@/lib/supabase';

const API = 'https://api.groupme.com/v3';

/** How far ahead to publish. A whole season at once buries the calendar and
 *  makes RSVPs meaningless; a week gives people time to answer. */
export const DEFAULT_WINDOW_DAYS = 7;

/** Default length for a timed fixture, since the calendar stores no end time. */
const DEFAULT_DURATION_HOURS = 2;

export interface CalendarItem {
  kind: 'event' | 'game';
  id: number;
  teamId: number | null;
  /** Naive club wall-clock, e.g. "2026-09-12T11:00:00". */
  startsAt: string;
  timeTbd: boolean;
  name: string;
  description: string;
  location: string | null;
  /** True when the source row is cancelled/postponed and should be marked so. */
  cancelled: boolean;
}

export interface GroupMeEventPayload {
  name: string;
  description: string;
  location: { name: string } | undefined;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  timezone: string;
}

const teamName = (teams: Team[], id?: number | null) => teams.find(t => t.id === id)?.name;

/**
 * UTC offset for the club timezone on a given day, e.g. "-05:00" in summer and
 * "-06:00" in winter. Stored timestamps are naive wall-clock, so the offset has
 * to be derived per date or every event lands an hour out across a DST change.
 */
export function clubOffset(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return '-06:00';
  const [, y, mo, d] = m;
  // Noon UTC is safely inside the same local day everywhere in the US.
  const probe = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 12));
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIME_ZONE, timeZoneName: 'longOffset',
  }).formatToParts(probe).find(p => p.type === 'timeZoneName')?.value || 'GMT-6';
  const off = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!off) return '-06:00';
  const [, sign, hh, mm = '00'] = off;
  return `${sign}${hh.padStart(2, '0')}:${mm}`;
}

/** Add hours to a naive wall-clock string, staying in wall-clock space. */
function addHours(wallClock: string, hours: number): string {
  const d = new Date(`${wallClock.slice(0, 19)}Z`);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().slice(0, 19);
}

/** Midnight on the day after `dateStr`, for all-day events. */
function nextMidnight(dateStr: string): string {
  const day = dateStr.slice(0, 10);
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.toISOString().slice(0, 10)}T00:00:00`;
}

export const CANCELLED_PREFIX = 'CANCELLED — ';

export function cancelledName(name: string): string {
  return name.startsWith(CANCELLED_PREFIX) ? name : `${CANCELLED_PREFIX}${name}`;
}

/**
 * Build the GroupMe payload for one calendar item.
 *
 * A fixture with no confirmed time becomes an all-day event rather than being
 * pinned to a misleading midnight — which is exactly how the club was entering
 * these by hand.
 */
export function buildCalendarEvent(item: CalendarItem): GroupMeEventPayload {
  const offset = clubOffset(item.startsAt);
  const allDay = item.timeTbd;
  const start = allDay ? `${item.startsAt.slice(0, 10)}T00:00:00` : item.startsAt.slice(0, 19);
  const end = allDay ? nextMidnight(item.startsAt) : addHours(start, DEFAULT_DURATION_HOURS);

  return {
    name: item.cancelled ? cancelledName(item.name) : item.name,
    description: item.description,
    location: item.location ? { name: item.location } : undefined,
    start_at: `${start}${offset}`,
    end_at: `${end}${offset}`,
    is_all_day: allDay,
    timezone: CLUB_TIME_ZONE,
  };
}

/**
 * Stable fingerprint of what we published, so an unchanged fixture costs no API
 * calls. Deliberately covers only fields we send — a GroupMe-side edit (someone
 * adding a note in the app) must not look like a change and get overwritten.
 */
export function calendarContentHash(payload: GroupMeEventPayload): string {
  const basis = [
    payload.name, payload.description, payload.location?.name ?? '',
    payload.start_at, payload.end_at, String(payload.is_all_day),
  ].join('\u0000');
  // djb2 — no crypto import needed, and collisions here only cost a redundant update.
  let h = 5381;
  for (let i = 0; i < basis.length; i++) h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/**
 * One-line description of a calendar action, for the bot activity log.
 *
 * The log is read by a coach asking "why did that event appear, or change?",
 * so it names the fixture and when it is — not internal ids.
 */
export function calendarActivitySummary(
  action: 'created' | 'updated' | 'cancelled',
  item: CalendarItem,
): string {
  const time = item.timeTbd ? 'time TBD' : formatWallClockTime(item.startsAt);
  const { venue } = splitLocation(item.location);
  const verb = action === 'created' ? 'Added' : action === 'updated' ? 'Updated' : 'Marked cancelled';
  return [
    `${verb} calendar event: ${item.name}`,
    `${formatWallClockDate(item.startsAt)}${time ? ` · ${time}` : ''}`,
    venue,
  ].filter(Boolean).join('\n');
}

/** Whether a fixture falls inside the publish window (today .. +days). */
export function isWithinWindow(dateStr: string, todayYmd: string, days: number): boolean {
  const day = (dateStr || '').slice(0, 10);
  if (!day) return false;
  const end = new Date(`${todayYmd}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  return day >= todayYmd && day <= end.toISOString().slice(0, 10);
}

// ------------------------------------------------------- item construction

export function gameToItem(g: Schedule, teams: Team[]): CalendarItem {
  const team = teamName(teams, g.team_id);
  const side = g.home_game ? 'vs' : '@';
  const { venue, address } = splitLocation(g.location);
  const time = formatWallClockTime(g.game_date, g.time_tbd);
  return {
    kind: 'game',
    id: g.id,
    teamId: g.team_id ?? null,
    startsAt: g.game_date,
    timeTbd: !!g.time_tbd,
    name: `${team ? `${team} ` : ''}${side} ${g.opponent}`,
    description: [
      `${side} ${g.opponent}`,
      `${formatWallClockDate(g.game_date)}${time ? ` · ${time}` : ''}`,
      venue,
      address,
    ].filter(Boolean).join('\n'),
    location: g.location || null,
    cancelled: g.status === 'cancelled' || g.status === 'postponed',
  };
}

export function eventToItem(e: Event, teams: Team[]): CalendarItem {
  const team = teamName(teams, e.team_id);
  const { venue, address } = splitLocation(e.location);
  const time = formatWallClockTime(e.event_date, e.time_tbd);
  // A practice's title is always "Practice"; other types carry a real title.
  const label = e.event_type === 'practice' ? 'Practice' : e.title;
  return {
    kind: 'event',
    id: e.id,
    teamId: e.team_id ?? null,
    startsAt: e.event_date,
    timeTbd: !!e.time_tbd,
    name: `${team ? `${team} ` : ''}${label}`,
    description: [
      label,
      `${formatWallClockDate(e.event_date)}${time ? ` · ${time}` : ''}`,
      venue,
      address,
    ].filter(Boolean).join('\n'),
    location: e.location || null,
    cancelled: false,
  };
}

// ------------------------------------------------------------- API client

async function call(path: string, token: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Access-Token': token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* GroupMe returns an HTML page on 5xx */ }
  if (!res.ok) {
    const detail = json?.meta?.errors?.join(', ') || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return json?.response;
}

export async function listCalendarEvents(groupId: string, token: string): Promise<any[]> {
  const r = await call(`/conversations/${groupId}/events/list`, token);
  return r?.events || [];
}

export async function createCalendarEvent(groupId: string, token: string, payload: GroupMeEventPayload): Promise<string> {
  const r = await call(`/conversations/${groupId}/events/create`, token, payload);
  const id = r?.event?.event_id || r?.event_id;
  if (!id) throw new Error('create returned no event_id');
  return id;
}

export async function updateCalendarEvent(
  groupId: string, token: string, eventId: string, payload: GroupMeEventPayload,
): Promise<void> {
  await call(`/conversations/${groupId}/events/update`, token, { ...payload, event_id: eventId });
}
