import { describe, it, expect } from 'vitest';
import { buildCalendarItems, calendarEditHref, CalendarItem } from './calendar';
import { Event, Schedule, Team } from './supabase';

const item = (over: Partial<CalendarItem>): CalendarItem => ({
  id: 1, kind: 'event', title: 't', date: '2026-11-07T10:00:00', typeLabel: 'other', ...over,
});

describe('calendarEditHref', () => {
  // Regression: the button used to link to a bare tab (e.g. ?tab=events),
  // which opened a blank create form and re-saving made a duplicate. The href
  // must carry the record id so the team page opens that record in edit mode.
  it('links a game to the schedule tab with its id', () => {
    expect(calendarEditHref(item({ id: 42, kind: 'game', typeLabel: 'league' })))
      .toBe('/admin/team?tab=schedule&edit=42');
  });

  it('links a practice to the practices tab with its id', () => {
    expect(calendarEditHref(item({ id: 7, kind: 'event', typeLabel: 'practice' })))
      .toBe('/admin/team?tab=practices&edit=7');
  });

  it('links other events (tournament/meeting/social) to the events tab with its id', () => {
    expect(calendarEditHref(item({ id: 9, kind: 'event', typeLabel: 'tournament' })))
      .toBe('/admin/team?tab=events&edit=9');
  });
});

describe('buildCalendarItems', () => {
  const teams = [{ id: 1, name: 'U11 Competitive' }] as Team[];

  it('maps a practice event so it round-trips through calendarEditHref to the practices tab', () => {
    const events = [{
      id: 5, title: 'U11 Practice', event_date: '2026-11-07T18:30:00',
      event_type: 'practice', team_id: 1,
    }] as unknown as Event[];
    const [it0] = buildCalendarItems(events, [], teams);
    expect(it0.typeLabel).toBe('practice');
    expect(calendarEditHref(it0)).toBe('/admin/team?tab=practices&edit=5');
  });

  it('maps a schedule game to a game item that links to the schedule tab', () => {
    const games = [{
      id: 3, opponent: 'FC Tulsa', game_date: '2026-11-07T10:00:00',
      home_game: true, game_type: 'league', team_id: 1, status: 'scheduled',
    }] as unknown as Schedule[];
    const [g0] = buildCalendarItems([], games, teams);
    expect(g0.kind).toBe('game');
    expect(calendarEditHref(g0)).toBe('/admin/team?tab=schedule&edit=3');
  });
});
