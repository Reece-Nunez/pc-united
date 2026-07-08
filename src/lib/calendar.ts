import { Event, Schedule, Team } from '@/lib/supabase';

export type CalendarItem = {
  id: number;
  kind: 'game' | 'event';
  title: string;
  date: string;
  endDate?: string;
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
    location: x.location, teamId: x.team_id ?? null, teamName: nameOf(x.team_id), typeLabel: x.game_type || 'Game',
    opponent: x.opponent, homeGame: x.home_game, ourScore: x.our_score ?? null, opponentScore: x.opponent_score ?? null,
    status: x.status, description: x.notes,
  }));
  const e: CalendarItem[] = events.filter(x => x.event_type !== 'game').map(x => ({
    id: x.id, kind: 'event', title: x.title, date: x.event_date, endDate: x.end_date,
    location: x.location, teamId: x.team_id ?? null, teamName: nameOf(x.team_id), typeLabel: x.event_type,
    description: x.description,
  }));
  return [...g, ...e];
}
