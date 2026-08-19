// Replies for the GroupMe bot's `!commands`.
//
// Pure formatting only — the route does the querying and passes rows in, the
// same split as lib/reminders.ts. That keeps every reply unit-testable, which
// matters more here than usual: a GroupMe group is a shared room, so a bug that
// leaks the wrong field is a privacy incident, not a cosmetic glitch.
//
// PRIVACY RULE: these replies may only contain information already public on
// the website. Any member of a group could type a command "for" another family,
// so dues balances, phone numbers, medical forms, and the coach-only player
// fields (coach_notes, strengths, areas_to_improve) are never answerable here.
//
// LAYOUT: replies are multi-line with `Label: value` rows. A single-line reply
// wrapped into an unreadable blob on phones once real venue strings (which
// carry a full postal address) were in play.

import { formatWallClockTime } from './reminders';
import type { Schedule, Event, Player, Team } from '@/lib/supabase';

/** "Sat, Sep 12" from a naive wall-clock timestamp, without going through Date. */
export function formatWallClockDate(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  if (!m) return '';
  const [, y, mo, d] = m;
  // Constructed as UTC and read back as UTC — no zone can shift the day.
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return dt.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Split a stored location into venue and street address.
 *
 * Google Places writes the whole thing into one column, e.g.
 * "Woodridge Soccer Complex, 4128 Lake Rd, Ponca City, OK 74604, USA".
 * Printing that raw is what made the old one-line replies unreadable.
 *
 * The first comma-separated part is the venue name — unless it starts with a
 * digit, in which case the string is a bare street address with no venue. A
 * trailing "USA" is dropped: nobody in Ponca City needs telling.
 */
export function splitLocation(location?: string | null): { venue: string | null; address: string | null } {
  const raw = (location || '').trim();
  if (!raw) return { venue: null, address: null };

  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length && /^(usa|us|united states)$/i.test(parts[parts.length - 1])) parts.pop();
  if (parts.length === 0) return { venue: null, address: null };

  // "4128 Lake Rd, ..." — no venue name, the whole thing is the address.
  if (/^\d/.test(parts[0])) return { venue: null, address: parts.join(', ') };

  const [venue, ...rest] = parts;
  return { venue, address: rest.length ? rest.join(', ') : null };
}

const teamName = (teams: Team[], id?: number | null) => teams.find(t => t.id === id)?.name;

/** Drop rows whose value is null/empty so no bare "Location:" line is emitted. */
function lines(rows: [string, string | null | undefined][]): string[] {
  return rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${v}`);
}

/** Date/time/location rows, shared by every command that describes one item. */
function whenWhereRows(dateStr: string, timeTbd: boolean | undefined, location?: string | null): [string, string | null][] {
  const time = formatWallClockTime(dateStr, timeTbd);
  const { venue, address } = splitLocation(location);
  return [
    ['Date', formatWallClockDate(dateStr)],
    ['Time', time || null],
    ['Location', venue],
    ['Address', address],
  ];
}

/**
 * Narrow rows to the group's team. `teamId` null means the group isn't bound to
 * a team, so nothing is filtered — better to show everything than nothing.
 * Rows with no team of their own are club-wide and always included.
 */
function forTeam<T extends { team_id?: number | null }>(rows: T[], teamId: number | null): T[] {
  if (teamId === null) return rows;
  return rows.filter(r => r.team_id === teamId || r.team_id == null);
}

export function formatNextGame(games: Schedule[], teams: Team[], teamId: number | null): string {
  const upcoming = forTeam(games, teamId);
  if (upcoming.length === 0) return 'No upcoming games on the schedule yet.';
  const g = upcoming[0];
  const body = lines([
    ['Opponent', `${g.home_game ? 'vs' : '@'} ${g.opponent}`],
    ...whenWhereRows(g.game_date, g.time_tbd, g.location),
  ]);
  return ['Next Game', ...body].join('\n');
}

/**
 * Several games at once. Deliberately looser than the labelled block above —
 * four labelled records would run past twenty lines and defeat the point.
 */
export function formatSchedule(games: Schedule[], teams: Team[], teamId: number | null, limit = 4): string {
  const upcoming = forTeam(games, teamId).slice(0, limit);
  if (upcoming.length === 0) return 'No upcoming games on the schedule yet.';

  const blocks = upcoming.map(g => {
    const time = formatWallClockTime(g.game_date, g.time_tbd);
    const { venue } = splitLocation(g.location);
    return [
      `${formatWallClockDate(g.game_date)}${time ? ` · ${time}` : ''}`,
      `${g.home_game ? 'vs' : '@'} ${g.opponent}`,
      venue,
    ].filter(Boolean).join('\n');
  });
  return [`Next ${upcoming.length} Game${upcoming.length !== 1 ? 's' : ''}`, ...blocks].join('\n\n');
}

export function formatNextPractice(events: Event[], teamId: number | null): string {
  const practices = forTeam(events, teamId).filter(e => e.event_type === 'practice');
  if (practices.length === 0) return 'No practices on the calendar right now.';
  const p = practices[0];
  return ['Next Practice', ...lines(whenWhereRows(p.event_date, p.time_tbd, p.location))].join('\n');
}

/**
 * Where the next thing on the calendar is, with a map link. Takes games and
 * events together because "where are we going next" doesn't care which table
 * the row came from.
 */
export function formatField(games: Schedule[], events: Event[], teamId: number | null): string {
  const candidates: { when: string; tbd?: boolean; label: string; location?: string }[] = [
    ...forTeam(games, teamId).map(g => ({
      when: g.game_date, tbd: g.time_tbd, label: `${g.home_game ? 'vs' : '@'} ${g.opponent}`, location: g.location,
    })),
    ...forTeam(events, teamId).map(e => ({
      when: e.event_date, tbd: e.time_tbd, label: e.event_type === 'practice' ? 'Practice' : e.title, location: e.location,
    })),
  ].filter(c => c.location).sort((a, b) => a.when.localeCompare(b.when));

  if (candidates.length === 0) return 'Nothing upcoming has a location set yet.';
  const next = candidates[0];
  const body = lines([
    ['What', next.label],
    ...whenWhereRows(next.when, next.tbd, next.location),
    ['Map', `https://maps.google.com/?q=${encodeURIComponent(next.location!)}`],
  ]);
  return ['Next Up', ...body].join('\n');
}

/**
 * Season record from completed games. A game only counts once both scores are
 * recorded; a "completed" game still awaiting a score would otherwise register
 * as a 0-0 draw.
 */
export function formatRecord(games: Schedule[], teamId: number | null, seasonLabel?: string): string {
  const played = forTeam(games, teamId).filter(
    g => g.status === 'completed' && g.our_score != null && g.opponent_score != null,
  );
  if (played.length === 0) return 'No completed games yet this season.';

  let w = 0, l = 0, d = 0, gf = 0, ga = 0;
  for (const g of played) {
    const us = Number(g.our_score) || 0;
    const them = Number(g.opponent_score) || 0;
    gf += us; ga += them;
    if (us > them) w++; else if (us < them) l++; else d++;
  }
  const body = lines([
    ['Season', seasonLabel || null],
    ['Record', `${w}-${l}-${d}`],
    ['Played', String(played.length)],
    ['Goals', `${gf} scored, ${ga} conceded`],
  ]);
  return ['Season Record', ...body].join('\n');
}

/**
 * Roster as jersey number + name + position — exactly the three fields the
 * public /players page already shows. Never widen this: the same row carries
 * coach_notes, strengths and areas_to_improve.
 */
export function formatRoster(players: Player[], teamId: number | null, teams: Team[]): string {
  const active = players
    .filter(p => !p.status || p.status === 'active')
    .filter(p => teamId === null || p.team_id === teamId)
    .sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999));

  if (active.length === 0) return 'No players on the roster yet.';
  const label = teamId === null ? 'Roster' : `${teamName(teams, teamId) || 'Roster'} Roster`;
  const rows = active.map(p => {
    const num = p.jersey_number != null ? `#${p.jersey_number} ` : '';
    // The club leaves position as the literal "TBD" until it's decided;
    // printing "— TBD" on every line is noise, not information.
    const pos = p.position && !/^tbd$/i.test(p.position.trim()) ? ` — ${p.position}` : '';
    return `${num}${p.name}${pos}`;
  });
  return [`${label} (${active.length})`, ...rows].join('\n');
}

export const COMMAND_HELP: [string, string][] = [
  ['!next', 'next game'],
  ['!schedule', 'next few games'],
  ['!practice', 'next practice'],
  ['!field', 'where the next event is, with a map (or !where)'],
  ['!record', 'season record'],
  ['!roster', 'players and jersey numbers'],
  ['!help', 'this message'],
];

export function formatHelp(): string {
  return ['Commands', ...COMMAND_HELP.map(([c, d]) => `${c} — ${d}`)].join('\n');
}
