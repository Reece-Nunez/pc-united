import { Event, Schedule, Team } from '@/lib/supabase';

export type CalendarItem = {
  id: number;
  kind: 'game' | 'event';
  title: string;
  date: string;
  endDate?: string;
  timeTbd?: boolean;
  location?: string;
  teamId?: number | null;
  teamName?: string;
  typeLabel: string;
  description?: string;
  opponent?: string;
  homeGame?: boolean;
  ourScore?: number | null;
  opponentScore?: number | null;
  status?: string;
};

// Merge games (schedule) + non-game events into a single calendar list.
// Plain module (no 'use client') so both server pages and the client calendar
// component can build the item list.
export function buildCalendarItems(events: Event[], games: Schedule[], teams: Team[]): CalendarItem[] {
  const nameOf = (id?: number | null) => teams.find(t => t.id === id)?.name;
  const g: CalendarItem[] = games.map(x => ({
    id: x.id, kind: 'game', title: `${x.home_game ? 'vs' : '@'} ${x.opponent}`, date: x.game_date,
    timeTbd: x.time_tbd,
    location: x.location, teamId: x.team_id ?? null, teamName: nameOf(x.team_id), typeLabel: x.game_type || 'Game',
    opponent: x.opponent, homeGame: x.home_game, ourScore: x.our_score ?? null, opponentScore: x.opponent_score ?? null,
    status: x.status, description: x.notes,
  }));
  const e: CalendarItem[] = events.filter(x => x.event_type !== 'game').map(x => ({
    id: x.id, kind: 'event', title: x.title, date: x.event_date, endDate: x.end_date,
    timeTbd: x.time_tbd,
    location: x.location, teamId: x.team_id ?? null, teamName: nameOf(x.team_id), typeLabel: x.event_type,
    description: x.description,
  }));
  return [...g, ...e];
}

// Deep-link from a calendar item to its edit form in Team Content. Games live
// in the schedule table; practices and other events live in the events table
// but land on different tabs. The `edit=<id>` param tells the team page which
// existing record to open in edit mode — without it the tab opens a blank
// "create" form, which reads as adding a duplicate. See the deep-link effect
// in src/app/admin/team/page.tsx that consumes this.
export function calendarEditHref(item: CalendarItem): string {
  const tab = item.kind === 'game' ? 'schedule'
    : item.typeLabel === 'practice' ? 'practices'
    : 'events';
  return `/admin/team?tab=${tab}&edit=${item.id}`;
}
