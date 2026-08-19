import { describe, it, expect } from 'vitest';
import {
  formatWallClockDate, splitLocation, formatNextGame, formatSchedule, formatNextPractice,
  formatField, formatRecord, formatRoster, formatHelp, COMMAND_HELP,
} from './groupme-commands';
import type { Schedule, Event, Player, Team } from '@/lib/supabase';

const TEAMS: Team[] = [{ id: 1, name: 'U11' } as Team, { id: 2, name: 'U12' } as Team];

// The real shape Google Places writes into the location column.
const VENUE = 'Woodridge Soccer Complex, 4128 Lake Rd, Ponca City, OK 74604, USA';

const game = (over: Partial<Schedule> = {}): Schedule => ({
  id: 1, opponent: 'Tulsa FC', game_date: '2026-09-12T11:00:00', location: 'Sooner Complex',
  home_game: true, game_type: 'league', status: 'scheduled', team_id: 1, ...over,
} as Schedule);

const event = (over: Partial<Event> = {}): Event => ({
  id: 10, title: 'Practice', event_date: '2026-08-22T09:00:00', event_type: 'practice',
  registration_required: false, team_id: null, location: 'Wentz Field', ...over,
} as Event);

const player = (over: Partial<Player> = {}): Player => ({
  id: 1, name: 'Sam Rivera', jersey_number: 7, position: 'Midfielder',
  birth_year: 2015, status: 'active', team_id: 1, ...over,
} as Player);

describe('splitLocation', () => {
  it('splits a Google Places string into venue and street address', () => {
    expect(splitLocation(VENUE)).toEqual({
      venue: 'Woodridge Soccer Complex',
      address: '4128 Lake Rd, Ponca City, OK 74604',
    });
  });

  it('treats a bare venue name as having no address', () => {
    expect(splitLocation('Wentz Field')).toEqual({ venue: 'Wentz Field', address: null });
  });

  it('treats a string starting with a street number as address-only', () => {
    // "4128 Lake Rd, Ponca City" has no venue to name.
    expect(splitLocation('4128 Lake Rd, Ponca City, OK 74604')).toEqual({
      venue: null,
      address: '4128 Lake Rd, Ponca City, OK 74604',
    });
  });

  it('drops a trailing country', () => {
    expect(splitLocation('Wentz Field, USA').address).toBeNull();
  });

  it('is empty for a missing or blank location', () => {
    expect(splitLocation(undefined)).toEqual({ venue: null, address: null });
    expect(splitLocation('   ')).toEqual({ venue: null, address: null });
  });
});

describe('formatWallClockDate', () => {
  it('formats without letting a timezone shift the day', () => {
    // "2026-09-12" must read as Sep 12 on a UTC server and a US one alike.
    expect(formatWallClockDate('2026-09-12T11:00:00')).toBe('Sat, Sep 12');
  });
  it('is empty for an unparseable value', () => {
    expect(formatWallClockDate('')).toBe('');
  });
});

describe('formatNextGame', () => {
  const games = [
    game({ id: 1, game_date: '2026-09-12T09:00:00', opponent: 'Enid SC', team_id: 2 }),
    game({ id: 2, game_date: '2026-09-12T11:00:00', opponent: 'Broken Arrow', team_id: 1 }),
  ];

  it('lays the reply out as labelled lines, splitting venue from address', () => {
    // The old one-liner wrapped into an unreadable blob in the group chat
    // because the location column carries a full postal address.
    const out = formatNextGame([game({ location: VENUE, time_tbd: true })], TEAMS, 1);
    expect(out.split('\n')).toEqual([
      'Next Game',
      'Opponent: vs Tulsa FC',
      'Date: Sat, Sep 12',
      'Time: TBD',
      'Location: Woodridge Soccer Complex',
      'Address: 4128 Lake Rd, Ponca City, OK 74604',
    ]);
  });

  it('omits rows with nothing to show rather than printing a bare label', () => {
    const out = formatNextGame([game({ location: '' })], TEAMS, 1);
    expect(out).not.toContain('Location:');
    expect(out).not.toContain('Address:');
  });

  it('answers the U11 chat with the U11 game, not the earlier U12 one', () => {
    expect(formatNextGame(games, TEAMS, 1)).toContain('Broken Arrow');
    expect(formatNextGame(games, TEAMS, 1)).not.toContain('Enid');
  });

  it('answers the U12 chat with the U12 game', () => {
    expect(formatNextGame(games, TEAMS, 2)).toContain('Enid');
  });

  it('shows everything when the group is not bound to a team', () => {
    expect(formatNextGame(games, TEAMS, null)).toContain('Enid');
  });

  it('includes club-wide games (no team) in a team chat', () => {
    const clubWide = [game({ id: 3, opponent: 'Scrimmage', team_id: null })];
    expect(formatNextGame(clubWide, TEAMS, 1)).toContain('Scrimmage');
  });

  it('says so plainly when nothing is scheduled', () => {
    expect(formatNextGame([], TEAMS, 1)).toBe('No upcoming games on the schedule yet.');
  });

  it('uses "@" for away games', () => {
    expect(formatNextGame([game({ home_game: false })], TEAMS, 1)).toContain('Opponent: @ Tulsa FC');
  });
});

describe('formatSchedule', () => {
  it('separates games into blocks', () => {
    const games = [1, 2, 3, 4, 5].map(i => game({ id: i, game_date: `2026-09-1${i}T11:00:00` }));
    const out = formatSchedule(games, TEAMS, 1, 4);
    expect(out).toContain('Next 4 Games');
    expect(out.split('\n\n')).toHaveLength(5); // header + 4 blocks
  });

  it('shows only the venue name, not the full postal address', () => {
    // Four full addresses would run past twenty lines and defeat the point.
    const out = formatSchedule([game({ location: VENUE })], TEAMS, 1);
    expect(out).toContain('Woodridge Soccer Complex');
    expect(out).not.toContain('4128 Lake Rd');
  });

  it('is scoped to the asking team', () => {
    const games = [game({ id: 1, team_id: 2, opponent: 'Enid SC' }), game({ id: 2, team_id: 1 })];
    expect(formatSchedule(games, TEAMS, 1)).not.toContain('Enid');
  });
});

describe('formatNextPractice', () => {
  it('returns the soonest practice as labelled lines', () => {
    const out = formatNextPractice([event()], null);
    expect(out.split('\n')).toEqual([
      'Next Practice',
      'Date: Sat, Aug 22',
      'Time: 9:00 AM',
      'Location: Wentz Field',
    ]);
  });

  it('ignores non-practice events', () => {
    expect(formatNextPractice([event({ event_type: 'tournament' })], null))
      .toBe('No practices on the calendar right now.');
  });

  it('renders a TBD time as TBD rather than midnight', () => {
    expect(formatNextPractice([event({ time_tbd: true })], null)).toContain('Time: TBD');
  });
});

describe('formatField', () => {
  it('points at the soonest located item, with a map link', () => {
    const out = formatField([game({ game_date: '2026-09-12T11:00:00' })], [], 1);
    expect(out).toContain('Next Up');
    expect(out).toContain('What: vs Tulsa FC');
    expect(out).toContain('Location: Sooner Complex');
    expect(out).toContain('Map: https://maps.google.com/?q=Sooner%20Complex');
  });

  it('links the full stored location even though it displays split', () => {
    const out = formatField([game({ location: VENUE })], [], 1);
    expect(out).toContain('Location: Woodridge Soccer Complex');
    expect(out).toContain('Address: 4128 Lake Rd, Ponca City, OK 74604');
    expect(out).toContain('Map: https://maps.google.com/?q=Woodridge');
  });

  it('prefers whichever comes first across games and events', () => {
    const out = formatField(
      [game({ game_date: '2026-09-12T11:00:00' })],
      [event({ event_date: '2026-08-22T09:00:00' })],
      null,
    );
    expect(out).toContain('Wentz Field');
  });

  it('skips items with no location instead of linking an empty map', () => {
    expect(formatField([game({ location: '' })], [], 1)).toBe('Nothing upcoming has a location set yet.');
  });
});

describe('formatRecord', () => {
  const played = (our: number, opp: number, id: number) =>
    game({ id, status: 'completed', our_score: our, opponent_score: opp });

  it('counts wins, losses and draws with goals for and against', () => {
    const out = formatRecord([played(3, 1, 1), played(0, 2, 2), played(1, 1, 3)], 1, 'Fall 2026');
    expect(out.split('\n')).toEqual([
      'Season Record',
      'Season: Fall 2026',
      'Record: 1-1-1',
      'Played: 3',
      'Goals: 4 scored, 4 conceded',
    ]);
  });

  it('ignores a completed game that has no score yet', () => {
    // Otherwise an unscored game registers as a 0-0 draw and skews the record.
    const out = formatRecord([game({ status: 'completed' }), played(2, 0, 2)], 1);
    expect(out).toContain('Record: 1-0-0');
    expect(out).toContain('Played: 1');
  });

  it('ignores games that are not completed', () => {
    expect(formatRecord([game({ status: 'scheduled' })], 1)).toBe('No completed games yet this season.');
  });

  it('is scoped to the asking team', () => {
    const out = formatRecord([played(5, 0, 1), { ...played(0, 5, 2), team_id: 2 } as Schedule], 1);
    expect(out).toContain('Record: 1-0-0');
  });
});

describe('formatRoster', () => {
  const roster = [
    player({ id: 1, name: 'Sam Rivera', jersey_number: 7 }),
    player({ id: 2, name: 'Alex Chen', jersey_number: 3 }),
    player({ id: 3, name: 'Jordan Lee', jersey_number: 5, team_id: 2 }),
  ];

  it('lists the asking team only, ordered by jersey number', () => {
    const out = formatRoster(roster, 1, TEAMS);
    expect(out).toContain('U11 Roster (2)');
    expect(out.indexOf('Alex Chen')).toBeLessThan(out.indexOf('Sam Rivera')); // #3 before #7
    expect(out).not.toContain('Jordan Lee');
  });

  it('puts each player on their own line', () => {
    expect(formatRoster(roster, 1, TEAMS).split('\n')).toEqual([
      'U11 Roster (2)',
      '#3 Alex Chen — Midfielder',
      '#7 Sam Rivera — Midfielder',
    ]);
  });

  it('omits an undecided "TBD" position rather than printing it', () => {
    const out = formatRoster([player({ position: 'TBD' })], 1, TEAMS);
    expect(out).toContain('#7 Sam Rivera');
    expect(out).not.toContain('TBD');
  });

  it('omits inactive players', () => {
    expect(formatRoster([player({ status: 'inactive' })], 1, TEAMS)).toBe('No players on the roster yet.');
  });

  it('NEVER exposes coach-only fields', () => {
    // The player row carries coach_notes / strengths / areas_to_improve. A
    // GroupMe group is a shared room; leaking these is a privacy incident.
    const out = formatRoster([player({
      coach_notes: 'struggles with left foot',
      strengths: ['pace'],
      areas_to_improve: ['positioning'],
    } as Partial<Player>)], 1, TEAMS);
    expect(out).not.toContain('struggles');
    expect(out).not.toContain('pace');
    expect(out).not.toContain('positioning');
    expect(out).toContain('Sam Rivera');
  });

  it('handles a player with no jersey number', () => {
    expect(formatRoster([player({ jersey_number: undefined as any })], 1, TEAMS)).toContain('Sam Rivera');
  });
});

describe('formatHelp', () => {
  it('lists every command, one per line', () => {
    const out = formatHelp();
    expect(out.split('\n')[0]).toBe('Commands');
    COMMAND_HELP.forEach(([cmd]) => expect(out).toContain(cmd));
  });
});
