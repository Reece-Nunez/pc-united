import { describe, it, expect } from 'vitest';
import {
  formatWallClockTime, isOnClubDay, buildReminderItems, recipientsFor,
  parseRsvpReply, reminderItemLabel, wallClockPlusMinutes, buildCoachDigests,
  buildGroupMeItems, buildCancellationMessage,
  ReminderItem, ParentLinkRow, RosterPlayer, AttendanceRow,
} from './reminders';
import type { Event, Schedule, Team } from '@/lib/supabase';

const TEAMS: Team[] = [
  { id: 1, name: 'U11' } as Team,
  { id: 2, name: 'U12' } as Team,
];

const practice = (over: Partial<Event> = {}): Event => ({
  id: 10, title: 'Practice', event_date: '2026-07-16T18:30:00', event_type: 'practice',
  registration_required: false, team_id: 2, location: 'Wentz Field', ...over,
} as Event);

const game = (over: Partial<Schedule> = {}): Schedule => ({
  id: 20, opponent: 'Tulsa FC', game_date: '2026-07-16T10:00:00', location: 'Sooner Complex',
  home_game: true, game_type: 'league', status: 'scheduled', team_id: 1, ...over,
} as Schedule);

describe('formatWallClockTime', () => {
  it('formats evening wall-clock times without timezone shifting', () => {
    expect(formatWallClockTime('2026-07-16T18:30:00')).toBe('6:30 PM');
  });
  it('handles morning, noon, and midnight', () => {
    expect(formatWallClockTime('2026-07-16T09:05:00')).toBe('9:05 AM');
    expect(formatWallClockTime('2026-07-16T12:00:00')).toBe('12:00 PM');
    expect(formatWallClockTime('2026-07-16T00:15:00')).toBe('12:15 AM');
  });
  it('returns empty string for malformed input', () => {
    expect(formatWallClockTime('')).toBe('');
    expect(formatWallClockTime('2026-07-16')).toBe('');
  });
  it('returns "TBD" when the time is flagged unknown, ignoring the placeholder time', () => {
    expect(formatWallClockTime('2026-07-16T00:00:00', true)).toBe('TBD');
  });
});

describe('isOnClubDay', () => {
  it('matches only the given club day', () => {
    expect(isOnClubDay('2026-07-16T18:30:00', '2026-07-16')).toBe(true);
    expect(isOnClubDay('2026-07-17T00:30:00', '2026-07-16')).toBe(false);
    expect(isOnClubDay('', '2026-07-16')).toBe(false);
  });
});

describe('buildReminderItems', () => {
  it('includes today practices and scheduled games with team, time, and location', () => {
    const items = buildReminderItems([practice()], [game()], TEAMS, '2026-07-16');
    expect(items).toHaveLength(2);
    expect(items[0].message).toBe('Ponca City United FC: U12 practice today at 6:30 PM — Wentz Field. Reply YES if going or NO if not. Reply STOP to opt out.');
    expect(items[1].message).toBe('Ponca City United FC: U11 game today vs Tulsa FC at 10:00 AM — Sooner Complex. Reply YES if going or NO if not. Reply STOP to opt out.');
  });

  it('uses @ for away games', () => {
    const items = buildReminderItems([], [game({ home_game: false })], TEAMS, '2026-07-16');
    expect(items[0].message).toContain('game today @ Tulsa FC');
  });

  it('skips non-practice events and non-scheduled games', () => {
    const items = buildReminderItems(
      [practice({ event_type: 'meeting' }), practice({ event_type: 'social' })],
      [game({ status: 'cancelled' }), game({ status: 'postponed' }), game({ status: 'completed' })],
      TEAMS, '2026-07-16',
    );
    expect(items).toHaveLength(0);
  });

  it('skips items on other days', () => {
    const items = buildReminderItems(
      [practice({ event_date: '2026-07-17T18:30:00' })],
      [game({ game_date: '2026-07-15T10:00:00' })],
      TEAMS, '2026-07-16',
    );
    expect(items).toHaveLength(0);
  });

  it('renders "at TBD" when a practice or game has an unknown time', () => {
    const items = buildReminderItems(
      [practice({ event_date: '2026-07-16T00:00:00', time_tbd: true })],
      [game({ game_date: '2026-07-16T00:00:00', time_tbd: true })],
      TEAMS, '2026-07-16',
    );
    expect(items[0].message).toContain('U12 practice today at TBD — Wentz Field.');
    expect(items[1].message).toContain('U11 game today vs Tulsa FC at TBD — Sooner Complex.');
  });

  it('handles missing team and location gracefully', () => {
    const items = buildReminderItems([practice({ team_id: null, location: undefined })], [], TEAMS, '2026-07-16');
    expect(items[0].teamId).toBeNull();
    expect(items[0].message).toBe('Ponca City United FC: Practice today at 6:30 PM. Reply YES if going or NO if not. Reply STOP to opt out.');
  });
});

describe('recipientsFor', () => {
  const links: ParentLinkRow[] = [
    { parent_phone: '(580) 555-1111', status: 'approved', players: { team_id: 2 } },
    { parent_phone: '580-555-2222', status: 'approved', players: { team_id: 1 } },
    { parent_phone: '5805551111', status: 'approved', players: { team_id: 2 } },   // same parent, sibling on same team
    { parent_phone: '580555', status: 'approved', players: { team_id: 2 } },       // invalid phone
    { parent_phone: '5805553333', status: 'pending', players: { team_id: 2 } },    // not approved
    { parent_phone: null, status: 'approved', players: { team_id: 2 } },           // no phone
  ];
  const item = (teamId: number | null): ReminderItem => ({ kind: 'event', id: 1, teamId, message: 'x' });

  it('returns approved, deduped E.164 phones for the item team only', () => {
    expect(recipientsFor(item(2), links)).toEqual(['+15805551111']);
  });

  it('sends team-less items to every approved parent', () => {
    expect(recipientsFor(item(null), links).sort()).toEqual(['+15805551111', '+15805552222']);
  });

  it('excludes links whose player row is missing', () => {
    expect(recipientsFor(item(2), [{ parent_phone: '5805554444', status: 'approved', players: null }])).toEqual([]);
  });
});

describe('parseRsvpReply', () => {
  it('understands yes/no/maybe variants regardless of case and punctuation', () => {
    expect(parseRsvpReply('YES')).toBe('going');
    expect(parseRsvpReply(' yes! ')).toBe('going');
    expect(parseRsvpReply('y')).toBe('going');
    expect(parseRsvpReply('Yeah')).toBe('going');
    expect(parseRsvpReply('NO')).toBe('not_going');
    expect(parseRsvpReply('n')).toBe('not_going');
    expect(parseRsvpReply("can't")).toBe('not_going');
    expect(parseRsvpReply('maybe')).toBe('maybe');
  });
  it('returns null for anything else', () => {
    expect(parseRsvpReply('what time?')).toBeNull();
    expect(parseRsvpReply('')).toBeNull();
  });
});

describe('reminderItemLabel', () => {
  it('labels practices and games with team names', () => {
    expect(reminderItemLabel('event', { team_id: 2 }, TEAMS)).toBe('U12 practice');
    expect(reminderItemLabel('game', { team_id: 1, opponent: 'Tulsa FC', home_game: false }, TEAMS)).toBe('U11 game @ Tulsa FC');
    expect(reminderItemLabel('event', { team_id: null }, TEAMS)).toBe('practice');
  });
});

describe('wallClockPlusMinutes', () => {
  it('adds minutes within a day and across midnight without timezone shifts', () => {
    expect(wallClockPlusMinutes('2026-07-16T16:00:00', 120)).toBe('2026-07-16T18:00:00');
    expect(wallClockPlusMinutes('2026-07-16T23:30:00', 60)).toBe('2026-07-17T00:30:00');
  });
});

describe('buildCoachDigests', () => {
  const PLAYERS: RosterPlayer[] = [
    { id: 1, name: 'Jax', team_id: 2 },
    { id: 2, name: 'Mia', team_id: 2 },
    { id: 3, name: 'Sam', team_id: 2 },
    { id: 4, name: 'Ty', team_id: 1 },
  ];
  const ATTENDANCE: AttendanceRow[] = [
    { event_id: 10, schedule_id: null, player_id: 1, rsvp: 'going' },
    { event_id: 10, schedule_id: null, player_id: 2, rsvp: 'not_going' },
    // Sam has no row → "No reply"; Ty is on the other team → excluded.
    { event_id: 99, schedule_id: null, player_id: 3, rsvp: 'going' },   // different event, ignored
    { event_id: null, schedule_id: 20, player_id: 4, rsvp: 'going' },
  ];

  it('builds a digest for a practice starting within the window', () => {
    const digests = buildCoachDigests([practice()], [], TEAMS, PLAYERS, ATTENDANCE, '2026-07-16T17:00:00', 120);
    expect(digests).toHaveLength(1);
    expect(digests[0]).toMatchObject({ kind: 'event', id: 10 });
    expect(digests[0].message).toBe(
      'Ponca City United FC coach digest — U12 practice at 6:30 PM, Wentz Field. Going (1): Jax. Not going (1): Mia. No reply (1): Sam.'
    );
  });

  it('matches game attendance via schedule_id', () => {
    const digests = buildCoachDigests([], [game()], TEAMS, PLAYERS, ATTENDANCE, '2026-07-16T08:30:00', 120);
    expect(digests).toHaveLength(1);
    expect(digests[0].message).toContain('U11 game vs Tulsa FC at 10:00 AM, Sooner Complex. Going (1): Ty.');
  });

  it('excludes items outside the window (too far out or already started)', () => {
    expect(buildCoachDigests([practice()], [], TEAMS, PLAYERS, [], '2026-07-16T12:00:00', 120)).toHaveLength(0);
    expect(buildCoachDigests([practice()], [], TEAMS, PLAYERS, [], '2026-07-16T18:30:00', 120)).toHaveLength(0);
  });

  it('excludes cancelled games and non-practice events', () => {
    expect(buildCoachDigests(
      [practice({ event_type: 'meeting' })],
      [game({ status: 'cancelled', game_date: '2026-07-16T10:00:00' })],
      TEAMS, PLAYERS, [], '2026-07-16T09:00:00', 120,
    )).toHaveLength(0);
  });
});

describe('buildGroupMeItems', () => {
  const DAY = '2026-07-16';

  it('announces practices and scheduled games', () => {
    const items = buildGroupMeItems([practice()], [game()], TEAMS, DAY, 'today');
    expect(items.map(i => i.message)).toEqual([
      'U12 — Practice today at 6:30 PM · Wentz Field',
      'U11 — Game today vs Tulsa FC at 10:00 AM · Sooner Complex',
    ]);
  });

  it('omits the SMS carrier text, which is meaningless in a group chat', () => {
    const [item] = buildGroupMeItems([practice()], [], TEAMS, DAY, 'today');
    expect(item.message).not.toMatch(/STOP|Reply YES/i);
  });

  it('includes tournaments, meetings and socials that SMS skips', () => {
    const events = [
      practice({ id: 1, event_type: 'tournament', title: 'Tulsa Cup' }),
      practice({ id: 2, event_type: 'meeting', title: 'Parent meeting' }),
      practice({ id: 3, event_type: 'social', title: 'End of season party' }),
    ];
    const messages = buildGroupMeItems(events, [], TEAMS, DAY, 'today').map(i => i.message);
    expect(messages[0]).toContain('Tournament: Tulsa Cup');
    expect(messages[1]).toContain('Meeting: Parent meeting');
    expect(messages[2]).toContain('Team social: End of season party');
  });

  it('announces event_type "other" using its title as the label', () => {
    // The club uses 'other' for real fixtures (e.g. a scrimmage); dropping
    // those silently is worse than an occasional low-value post.
    const [item] = buildGroupMeItems(
      [practice({ event_type: 'other', title: '⚽ ENID SCRIMMAGE' })], [], TEAMS, DAY, 'today',
    );
    expect(item.message).toContain('⚽ ENID SCRIMMAGE');
    expect(item.message).not.toContain('Event:');
  });

  it('says "tomorrow" on the evening run', () => {
    const [item] = buildGroupMeItems([practice()], [], TEAMS, DAY, 'tomorrow');
    expect(item.message).toContain('Practice tomorrow');
  });

  it('skips cancelled and postponed games', () => {
    expect(buildGroupMeItems([], [game({ status: 'cancelled' })], TEAMS, DAY, 'today')).toEqual([]);
    expect(buildGroupMeItems([], [game({ status: 'postponed' })], TEAMS, DAY, 'today')).toEqual([]);
  });

  it('skips items on a different day', () => {
    expect(buildGroupMeItems([practice({ event_date: '2026-07-17T18:30:00' })], [], TEAMS, DAY, 'today')).toEqual([]);
  });

  it('spells out a TBD time instead of printing a bare "TBD"', () => {
    const [item] = buildGroupMeItems([practice({ time_tbd: true })], [], TEAMS, DAY, 'today');
    expect(item.message).toContain('at a time still TBD');
  });

  it('carries teamId through for routing, null when club-wide', () => {
    const items = buildGroupMeItems([practice({ team_id: null })], [game()], TEAMS, DAY, 'today');
    expect(items[0].teamId).toBeNull();
    expect(items[1].teamId).toBe(1);
  });
});

describe('buildCancellationMessage', () => {
  it('announces a cancelled game', () => {
    const msg = buildCancellationMessage(game({ status: 'cancelled' }), TEAMS);
    expect(msg).toBe('CANCELLED: U11 game vs Tulsa FC on 2026-07-16 at 10:00 AM is cancelled.');
  });

  it('announces a postponed game with its own word', () => {
    expect(buildCancellationMessage(game({ status: 'postponed' }), TEAMS)).toMatch(/^POSTPONED:/);
  });

  it('returns null for a game that is still on', () => {
    // Guards the immediate-post route against announcing ordinary edits.
    expect(buildCancellationMessage(game({ status: 'scheduled' }), TEAMS)).toBeNull();
    expect(buildCancellationMessage(game({ status: 'completed' }), TEAMS)).toBeNull();
  });

  it('drops the time when it is TBD', () => {
    const msg = buildCancellationMessage(game({ status: 'cancelled', time_tbd: true }), TEAMS);
    expect(msg).toContain('on 2026-07-16 is cancelled');
  });
});
