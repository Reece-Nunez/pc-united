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

import { formatWallClockTime } from './reminders';
import type { Schedule, Event, Player, Team } from '@/lib/supabase';

/** "Sat Sep 12" from a naive wall-clock timestamp, without going through Date. */
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

const teamName = (teams: Team[], id?: number | null) => teams.find(t => t.id === id)?.name;

/** "vs Tulsa FC, Sat Sep 12 at 11:00 AM — Sooner Complex" */
function gameLine(g: Schedule, teams: Team[], withTeam = false): string {
  const time = formatWallClockTime(g.game_date, g.time_tbd);
  const when = `${formatWallClockDate(g.game_date)}${time ? ` at ${time}` : ''}`;
  const who = `${g.home_game ? 'vs' : '@'} ${g.opponent}`;
  const team = withTeam ? teamName(teams, g.team_id) : undefined;
  return `${team ? `${team}: ` : ''}${who}, ${when}${g.location ? ` — ${g.location}` : ''}`;
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
  return `Next game: ${gameLine(upcoming[0], teams)}`;
}

export function formatSchedule(games: Schedule[], teams: Team[], teamId: number | null, limit = 4): string {
  const upcoming = forTeam(games, teamId).slice(0, limit);
  if (upcoming.length === 0) return 'No upcoming games on the schedule yet.';
  const lines = upcoming.map(g => `• ${gameLine(g, teams)}`);
  return `Next ${upcoming.length} game${upcoming.length !== 1 ? 's' : ''}:\n${lines.join('\n')}`;
}

export function formatNextPractice(events: Event[], teamId: number | null): string {
  const practices = forTeam(events, teamId).filter(e => e.event_type === 'practice');
  if (practices.length === 0) return 'No practices on the calendar right now.';
  const p = practices[0];
  const time = formatWallClockTime(p.event_date, p.time_tbd);
  return `Next practice: ${formatWallClockDate(p.event_date)}${time ? ` at ${time}` : ''}${p.location ? ` — ${p.location}` : ''}`;
}

/**
 * Where the next thing on the calendar is, with a map link. Takes games and
 * events together because "where are we going next" doesn't care which table
 * the row came from.
 */
export function formatField(games: Schedule[], events: Event[], teamId: number | null): string {
  const candidates: { when: string; label: string; location?: string }[] = [
    ...forTeam(games, teamId).map(g => ({
      when: g.game_date, label: `${g.home_game ? 'vs' : '@'} ${g.opponent}`, location: g.location,
    })),
    ...forTeam(events, teamId).map(e => ({
      when: e.event_date, label: e.event_type === 'practice' ? 'Practice' : e.title, location: e.location,
    })),
  ].filter(c => c.location).sort((a, b) => a.when.localeCompare(b.when));

  if (candidates.length === 0) return 'Nothing upcoming has a location set yet.';
  const next = candidates[0];
  const map = `https://maps.google.com/?q=${encodeURIComponent(next.location!)}`;
  return `${next.label} — ${formatWallClockDate(next.when)} at ${next.location}\n${map}`;
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
  const scope = seasonLabel ? ` (${seasonLabel})` : '';
  return `Record${scope}: ${w}-${l}-${d} · ${gf} scored, ${ga} conceded in ${played.length} game${played.length !== 1 ? 's' : ''}`;
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
  const label = teamId === null ? 'Roster' : `${teamName(teams, teamId) || 'Roster'} roster`;
  const lines = active.map(p => {
    const num = p.jersey_number != null ? `#${p.jersey_number} ` : '';
    return `${num}${p.name}${p.position ? ` (${p.position})` : ''}`;
  });
  return `${label} (${active.length}):\n${lines.join('\n')}`;
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
  return `Commands:\n${COMMAND_HELP.map(([c, d]) => `${c} — ${d}`).join('\n')}`;
}
