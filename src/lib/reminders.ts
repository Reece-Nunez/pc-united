import type { Event, Schedule, Team } from '@/lib/supabase';
import { toE164 } from '@/lib/sms';
import { CLUB_TIME_ZONE } from '@/lib/time';

// Morning-of SMS reminder logic, kept pure (no Supabase/Twilio calls) so the
// cron route stays a thin shell and this file is unit-testable.

export interface ReminderItem {
  kind: 'event' | 'game';
  id: number;
  teamId: number | null;
  message: string;
}

// Minimal shape of an approved parent_children row joined to its player.
export interface ParentLinkRow {
  parent_phone: string | null;
  status: string;
  players: { team_id: number | null } | null;
}

/**
 * "6:30 PM" from a stored naive wall-clock timestamp ("2026-07-16T18:30:00").
 * String math on purpose: these values are club wall-clock (see lib/time.ts),
 * so running them through Date would shift them by the server's timezone.
 */
export function formatWallClockTime(dateStr: string, timeTbd?: boolean): string {
  if (timeTbd) return 'TBD';
  const m = /T(\d{2}):(\d{2})/.exec(dateStr || '');
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm}`;
}

/** Whether a stored timestamp falls on the given club day ("YYYY-MM-DD"). */
export function isOnClubDay(dateStr: string, clubYmd: string): boolean {
  return !!dateStr && dateStr.startsWith(clubYmd);
}

const teamName = (teams: Team[], id?: number | null) =>
  teams.find(t => t.id === id)?.name;

function withPrefix(body: string): string {
  return `Ponca City United FC: ${body} Reply YES if going or NO if not. Reply STOP to opt out.`;
}

/**
 * Build the reminder list for one club day: practices from `events` and
 * scheduled games from `schedule`. Tournaments/meetings/socials and
 * cancelled/postponed games send nothing.
 */
export function buildReminderItems(
  events: Event[],
  games: Schedule[],
  teams: Team[],
  clubYmd: string,
): ReminderItem[] {
  const items: ReminderItem[] = [];

  for (const e of events) {
    if (e.event_type !== 'practice' || !isOnClubDay(e.event_date, clubYmd)) continue;
    const team = teamName(teams, e.team_id);
    const time = formatWallClockTime(e.event_date, e.time_tbd);
    const parts = [`${team ? team + ' p' : 'P'}ractice today`];
    if (time) parts.push(`at ${time}`);
    if (e.location) parts.push(`— ${e.location}.`); else parts[parts.length - 1] += '.';
    items.push({ kind: 'event', id: e.id, teamId: e.team_id ?? null, message: withPrefix(parts.join(' ')) });
  }

  for (const g of games) {
    if (g.status !== 'scheduled' || !isOnClubDay(g.game_date, clubYmd)) continue;
    const team = teamName(teams, g.team_id);
    const time = formatWallClockTime(g.game_date, g.time_tbd);
    const parts = [`${team ? team + ' g' : 'G'}ame today ${g.home_game ? 'vs' : '@'} ${g.opponent}`];
    if (time) parts.push(`at ${time}`);
    if (g.location) parts.push(`— ${g.location}.`); else parts[parts.length - 1] += '.';
    items.push({ kind: 'game', id: g.id, teamId: g.team_id ?? null, message: withPrefix(parts.join(' ')) });
  }

  return items;
}

/**
 * Interpret a parent's SMS reply as an RSVP. Tolerant of casing, punctuation,
 * and common variants; null means "didn't understand" (webhook sends a nudge).
 */
export function parseRsvpReply(body: string): 'going' | 'not_going' | 'maybe' | null {
  const word = (body || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (['YES', 'Y', 'YEP', 'YEAH', 'YEA', 'GOING'].includes(word)) return 'going';
  if (['NO', 'N', 'NOPE', 'NAH', 'NOTGOING', 'CANT'].includes(word)) return 'not_going';
  if (word === 'MAYBE') return 'maybe';
  return null;
}

// ─── GroupMe reminders ───────────────────────────────────────────────

export interface GroupMeItem {
  kind: 'event' | 'game';
  id: number;
  teamId: number | null;
  message: string;
}

/**
 * Event types announced in a group chat — every type the calendar offers.
 *
 * 'other' was excluded at first as too vague, but the club uses it for real
 * fixtures (e.g. "⚽ ENID SCRIMMAGE"), and silently dropping something families
 * need to show up for is far worse than an occasional low-value post.
 */
const ANNOUNCED_EVENT_TYPES = new Set(['practice', 'tournament', 'meeting', 'social', 'other', 'game']);

const EVENT_NOUN: Record<string, string> = {
  practice: 'Practice',
  tournament: 'Tournament',
  meeting: 'Meeting',
  social: 'Team social',
  game: 'Game',
};

/**
 * Build the GroupMe post list for one club day.
 *
 * Separate from `buildReminderItems` on purpose. That one drives SMS and its
 * messages carry carrier-compliance text ("Reply STOP to opt out") plus an
 * RSVP prompt — both meaningless in a group chat, where there is no STOP
 * handling and a bare "YES" can't be attributed to a particular child the way
 * a text from a known number can. It also covers only practices and games;
 * a group chat is the right place for tournaments, meetings and socials too.
 *
 * `when` shapes the wording: the evening run announces tomorrow, the morning
 * run announces today.
 */
export function buildGroupMeItems(
  events: Event[],
  games: Schedule[],
  teams: Team[],
  clubYmd: string,
  when: 'today' | 'tomorrow',
): GroupMeItem[] {
  const items: GroupMeItem[] = [];
  const day = when === 'today' ? 'today' : 'tomorrow';

  for (const e of events) {
    if (!ANNOUNCED_EVENT_TYPES.has(e.event_type) || !isOnClubDay(e.event_date, clubYmd)) continue;
    const team = teamName(teams, e.team_id);
    const time = formatWallClockTime(e.event_date, e.time_tbd);
    const noun = EVENT_NOUN[e.event_type] || 'Event';
    // A practice's title is always just "Practice", so the noun alone reads
    // better. An 'other' event has no useful noun — its title IS the label.
    // Everything else pairs the two ("Tournament: Broken Arrow Friendlies").
    const label = e.event_type === 'practice' ? noun
      : e.event_type === 'other' ? e.title
      : `${noun}: ${e.title}`;
    const parts = [`${team ? `${team} — ` : ''}${label} ${day}`];
    if (time) parts.push(time === 'TBD' ? 'at a time still TBD' : `at ${time}`);
    if (e.location) parts.push(`· ${e.location}`);
    items.push({ kind: 'event', id: e.id, teamId: e.team_id ?? null, message: parts.join(' ') });
  }

  for (const g of games) {
    if (g.status !== 'scheduled' || !isOnClubDay(g.game_date, clubYmd)) continue;
    const team = teamName(teams, g.team_id);
    const time = formatWallClockTime(g.game_date, g.time_tbd);
    const parts = [`${team ? `${team} — ` : ''}Game ${day} ${g.home_game ? 'vs' : '@'} ${g.opponent}`];
    if (time) parts.push(time === 'TBD' ? 'at a time still TBD' : `at ${time}`);
    if (g.location) parts.push(`· ${g.location}`);
    items.push({ kind: 'game', id: g.id, teamId: g.team_id ?? null, message: parts.join(' ') });
  }

  return items;
}

/**
 * Message for a game that has been called off. Written for immediate posting
 * rather than the daily cron — a cancellation that arrives with tomorrow's
 * reminder is worthless, since the whole point is reaching families before
 * they drive to the field.
 */
export function buildCancellationMessage(
  game: Pick<Schedule, 'opponent' | 'game_date' | 'time_tbd' | 'location' | 'home_game' | 'status' | 'team_id'>,
  teams: Team[],
): string | null {
  if (game.status !== 'cancelled' && game.status !== 'postponed') return null;
  const team = teamName(teams, game.team_id);
  const time = formatWallClockTime(game.game_date, game.time_tbd);
  const date = (game.game_date || '').slice(0, 10);
  const word = game.status === 'cancelled' ? 'CANCELLED' : 'POSTPONED';
  const when = time && time !== 'TBD' ? `${date} at ${time}` : date;
  return `${word}: ${team ? `${team} ` : ''}game ${game.home_game ? 'vs' : '@'} ${game.opponent} on ${when} is ${game.status}.`;
}

/** Short human label for a reminder item ("U12 practice", "game vs Tulsa FC"). */
export function reminderItemLabel(kind: 'event' | 'game', row: { opponent?: string; home_game?: boolean; team_id?: number | null }, teams: Team[]): string {
  const team = teamName(teams, row.team_id);
  if (kind === 'game') return `${team ? team + ' ' : ''}game ${row.home_game ? 'vs' : '@'} ${row.opponent}`;
  return `${team ? team + ' ' : ''}practice`;
}

// ─── Coach digest (sent ~1–2 h before start) ─────────────────────────

export interface RosterPlayer { id: number; name: string; team_id?: number | null; }
export interface AttendanceRow {
  event_id: number | null;
  schedule_id: number | null;
  player_id: number | null;
  rsvp: string | null;
}
export interface CoachDigest { kind: 'event' | 'game'; id: number; message: string; }

/** Current club wall-clock as a naive timestamp string (same frame as stored dates). */
export function clubWallClockNow(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now).reduce<Record<string, string>>((m, p) => { m[p.type] = p.value; return m; }, {});
  // hour12:false can yield "24" at midnight in some ICU versions.
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
}

/** Naive wall-clock arithmetic — treat the string as UTC so no zone leaks in. */
export function wallClockPlusMinutes(wallClock: string, minutes: number): string {
  const d = new Date(`${wallClock.slice(0, 19)}Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 19);
}

/**
 * Build coach digests for practices/games starting within the next
 * `windowMinutes` of club wall-clock `now`. RSVP breakdown comes from
 * event_attendance; roster players with no row land in "No reply".
 */
export function buildCoachDigests(
  events: Event[],
  games: Schedule[],
  teams: Team[],
  players: RosterPlayer[],
  attendance: AttendanceRow[],
  now: string,
  windowMinutes = 120,
): CoachDigest[] {
  const windowEnd = wallClockPlusMinutes(now, windowMinutes);
  const inWindow = (dateStr: string) => !!dateStr && dateStr > now && dateStr <= windowEnd;

  const digestFor = (kind: 'event' | 'game', id: number, teamId: number | null, header: string): CoachDigest => {
    const roster = players.filter(p => teamId == null || p.team_id === teamId);
    const rsvpByPlayer = new Map<number, string>();
    for (const a of attendance) {
      const matches = kind === 'event' ? a.event_id === id : a.schedule_id === id;
      if (matches && a.player_id != null && a.rsvp) rsvpByPlayer.set(a.player_id, a.rsvp);
    }
    const bucket = (status: string) => roster.filter(p => rsvpByPlayer.get(p.id) === status).map(p => p.name);
    const noReply = roster.filter(p => !rsvpByPlayer.has(p.id)).map(p => p.name);
    const sections: string[] = [];
    const going = bucket('going'), maybe = bucket('maybe'), not = bucket('not_going');
    if (going.length) sections.push(`Going (${going.length}): ${going.join(', ')}`);
    if (maybe.length) sections.push(`Maybe (${maybe.length}): ${maybe.join(', ')}`);
    if (not.length) sections.push(`Not going (${not.length}): ${not.join(', ')}`);
    if (noReply.length) sections.push(`No reply (${noReply.length}): ${noReply.join(', ')}`);
    const breakdown = sections.length ? sections.join('. ') + '.' : 'No players on the roster.';
    return { kind, id, message: `Ponca City United FC coach digest — ${header}. ${breakdown}` };
  };

  const digests: CoachDigest[] = [];
  for (const e of events) {
    if (e.event_type !== 'practice' || !inWindow(e.event_date)) continue;
    const header = `${reminderItemLabel('event', e, teams)} at ${formatWallClockTime(e.event_date, e.time_tbd)}${e.location ? `, ${e.location}` : ''}`;
    digests.push(digestFor('event', e.id, e.team_id ?? null, header));
  }
  for (const g of games) {
    if (g.status !== 'scheduled' || !inWindow(g.game_date)) continue;
    const header = `${reminderItemLabel('game', g, teams)} at ${formatWallClockTime(g.game_date, g.time_tbd)}${g.location ? `, ${g.location}` : ''}`;
    digests.push(digestFor('game', g.id, g.team_id ?? null, header));
  }
  return digests;
}

/**
 * Deduped E.164 phone list for one reminder item: approved parent links whose
 * child is on the item's team. Items without a team (club-wide practice) go
 * to every approved parent with a valid phone.
 */
export function recipientsFor(item: ReminderItem, links: ParentLinkRow[]): string[] {
  const phones = new Set<string>();
  for (const l of links) {
    if (l.status !== 'approved' || !l.parent_phone) continue;
    if (item.teamId != null && l.players?.team_id !== item.teamId) continue;
    const e164 = toE164(l.parent_phone);
    if (e164) phones.add(e164);
  }
  return [...phones];
}
