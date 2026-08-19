import { describe, it, expect } from 'vitest';
import {
  clubOffset, buildCalendarEvent, calendarContentHash, isWithinWindow,
  cancelledName, gameToItem, eventToItem, CANCELLED_PREFIX, type CalendarItem,
} from './groupme-calendar';
import type { Schedule, Event, Team } from '@/lib/supabase';

const TEAMS: Team[] = [{ id: 1, name: 'U11' } as Team, { id: 2, name: 'U12' } as Team];
const VENUE = 'Woodridge Soccer Complex, 4128 Lake Rd, Ponca City, OK 74604, USA';

const item = (over: Partial<CalendarItem> = {}): CalendarItem => ({
  kind: 'game', id: 1, teamId: 1, startsAt: '2026-09-12T11:00:00', timeTbd: false,
  name: 'U11 vs Tulsa FC', description: 'vs Tulsa FC', location: VENUE, cancelled: false, ...over,
});

describe('clubOffset', () => {
  it('is -05:00 during central daylight time', () => {
    expect(clubOffset('2026-09-12T11:00:00')).toBe('-05:00');
  });

  it('is -06:00 during central standard time', () => {
    // A fixture in January must not land an hour out because the offset was
    // hardcoded from a summer date.
    expect(clubOffset('2027-01-15T11:00:00')).toBe('-06:00');
  });

  it('falls back rather than throwing on an unparseable date', () => {
    expect(clubOffset('nonsense')).toBe('-06:00');
  });
});

describe('buildCalendarEvent', () => {
  it('builds a timed event with a default duration', () => {
    const p = buildCalendarEvent(item());
    expect(p.start_at).toBe('2026-09-12T11:00:00-05:00');
    expect(p.end_at).toBe('2026-09-12T13:00:00-05:00');
    expect(p.is_all_day).toBe(false);
    expect(p.timezone).toBe('America/Chicago');
    expect(p.location).toEqual({ name: VENUE });
  });

  it('makes a TBD fixture all-day instead of pinning it to midnight', () => {
    // Midnight would read as "12:00 AM" in the GroupMe calendar, which is wrong
    // and is exactly how the club was entering these by hand.
    const p = buildCalendarEvent(item({ timeTbd: true }));
    expect(p.is_all_day).toBe(true);
    expect(p.start_at).toBe('2026-09-12T00:00:00-05:00');
    expect(p.end_at).toBe('2026-09-13T00:00:00-05:00');
  });

  it('prefixes the name when the fixture is cancelled', () => {
    expect(buildCalendarEvent(item({ cancelled: true })).name).toBe(`${CANCELLED_PREFIX}U11 vs Tulsa FC`);
  });

  it('omits location entirely when there is none', () => {
    expect(buildCalendarEvent(item({ location: null })).location).toBeUndefined();
  });

  it('rolls an all-day fixture over a month boundary correctly', () => {
    const p = buildCalendarEvent(item({ startsAt: '2026-09-30T00:00:00', timeTbd: true }));
    expect(p.end_at).toBe('2026-10-01T00:00:00-05:00');
  });
});

describe('cancelledName', () => {
  it('marks a name once and only once', () => {
    const once = cancelledName('U11 vs Tulsa FC');
    expect(once).toBe(`${CANCELLED_PREFIX}U11 vs Tulsa FC`);
    // A repeated sync run must not stack prefixes.
    expect(cancelledName(once)).toBe(once);
  });
});

describe('calendarContentHash', () => {
  it('is stable for identical payloads', () => {
    expect(calendarContentHash(buildCalendarEvent(item())))
      .toBe(calendarContentHash(buildCalendarEvent(item())));
  });

  it('changes when a detail the sync publishes changes', () => {
    const base = calendarContentHash(buildCalendarEvent(item()));
    expect(calendarContentHash(buildCalendarEvent(item({ startsAt: '2026-09-12T14:00:00' })))).not.toBe(base);
    expect(calendarContentHash(buildCalendarEvent(item({ location: 'Elsewhere' })))).not.toBe(base);
    expect(calendarContentHash(buildCalendarEvent(item({ cancelled: true })))).not.toBe(base);
  });
});

describe('isWithinWindow', () => {
  const today = '2026-09-10';

  it('includes today and the far edge of the window', () => {
    expect(isWithinWindow('2026-09-10T09:00:00', today, 7)).toBe(true);
    expect(isWithinWindow('2026-09-17T09:00:00', today, 7)).toBe(true);
  });

  it('excludes anything past the window', () => {
    // The whole point: a season published at once makes RSVPs meaningless.
    expect(isWithinWindow('2026-09-18T09:00:00', today, 7)).toBe(false);
  });

  it('excludes the past', () => {
    expect(isWithinWindow('2026-09-09T09:00:00', today, 7)).toBe(false);
  });

  it('handles a window crossing a month boundary', () => {
    expect(isWithinWindow('2026-10-02T09:00:00', '2026-09-28', 7)).toBe(true);
    expect(isWithinWindow('2026-10-06T09:00:00', '2026-09-28', 7)).toBe(false);
  });

  it('rejects an empty date rather than treating it as today', () => {
    expect(isWithinWindow('', today, 7)).toBe(false);
  });
});

describe('gameToItem', () => {
  const game = (over: Partial<Schedule> = {}): Schedule => ({
    id: 5, opponent: 'Tulsa FC', game_date: '2026-09-12T11:00:00', location: VENUE,
    home_game: true, game_type: 'league', status: 'scheduled', team_id: 1, ...over,
  } as Schedule);

  it('names the event with team and opponent', () => {
    expect(gameToItem(game(), TEAMS).name).toBe('U11 vs Tulsa FC');
  });

  it('uses "@" for away games', () => {
    expect(gameToItem(game({ home_game: false }), TEAMS).name).toBe('U11 @ Tulsa FC');
  });

  it('splits venue and address into the description', () => {
    const d = gameToItem(game(), TEAMS).description;
    expect(d).toContain('Woodridge Soccer Complex');
    expect(d).toContain('4128 Lake Rd, Ponca City, OK 74604');
  });

  it('flags cancelled and postponed fixtures', () => {
    expect(gameToItem(game({ status: 'cancelled' }), TEAMS).cancelled).toBe(true);
    expect(gameToItem(game({ status: 'postponed' }), TEAMS).cancelled).toBe(true);
    expect(gameToItem(game({ status: 'scheduled' }), TEAMS).cancelled).toBe(false);
  });

  it('carries teamId for routing, null when club-wide', () => {
    expect(gameToItem(game({ team_id: null }), TEAMS).teamId).toBeNull();
  });
});

describe('eventToItem', () => {
  const event = (over: Partial<Event> = {}): Event => ({
    id: 9, title: 'Practice', event_date: '2026-08-22T09:00:00', event_type: 'practice',
    registration_required: false, team_id: null, location: 'Wentz Field', ...over,
  } as Event);

  it('uses "Practice" rather than the redundant title', () => {
    expect(eventToItem(event(), TEAMS).name).toBe('Practice');
  });

  it('uses the real title for other event types', () => {
    expect(eventToItem(event({ event_type: 'tournament', title: 'Broken Arrow Friendlies' }), TEAMS).name)
      .toBe('Broken Arrow Friendlies');
  });

  it('prefixes the team when the event belongs to one', () => {
    expect(eventToItem(event({ team_id: 2 }), TEAMS).name).toBe('U12 Practice');
  });
});
