import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const upsertRsvp = vi.fn();
const getAttendanceForPlayers = vi.fn();

vi.mock('@/lib/supabase', () => ({
  upsertRsvp: (...args: unknown[]) => upsertRsvp(...args),
  getAttendanceForPlayers: (...args: unknown[]) => getAttendanceForPlayers(...args),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import RsvpClient from './RsvpClient';

const roster = [
  { id: 1, name: 'Alex Kim', team_id: 1, teams: { name: 'U11' } },
  { id: 2, name: 'Sam Kim', team_id: 1, teams: { name: 'U11' } },
  { id: 3, name: 'Jo Lee', team_id: 2, teams: { name: 'U12' } },
] as never;

const games = [
  { id: 10, game_date: '2030-01-01T18:00:00+00:00', home_game: true, opponent: 'Rivals', location: 'Field 1', team_id: 1 },
] as never;

beforeEach(() => {
  vi.clearAllMocks();
  getAttendanceForPlayers.mockResolvedValue({ data: [] });
  upsertRsvp.mockResolvedValue({ error: null });
});

describe('RsvpClient multi-select', () => {
  it('applies one RSVP tap to every selected eligible player', async () => {
    render(<RsvpClient roster={roster} events={[] as never} games={games} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    await screen.findByText('Alex Kim');
    fireEvent.change(select, { target: { value: '2' } });
    await screen.findByText('Sam Kim');

    fireEvent.click(screen.getByRole('button', { name: 'Going' }));

    await waitFor(() => expect(upsertRsvp).toHaveBeenCalledTimes(2));
    const playerIds = upsertRsvp.mock.calls.map(c => c[0].player_id).sort();
    expect(playerIds).toEqual([1, 2]);
    for (const call of upsertRsvp.mock.calls) {
      expect(call[0]).toMatchObject({ schedule_id: 10, rsvp: 'going' });
    }
  });

  it('only RSVPs players eligible for the session (matching team)', async () => {
    render(<RsvpClient roster={roster} events={[] as never} games={games} />);

    const select = screen.getByRole('combobox');
    // Add a U11 player and a U12 player; the U11 game applies only to the U11 kid.
    fireEvent.change(select, { target: { value: '1' } });
    await screen.findByText('Alex Kim');
    fireEvent.change(select, { target: { value: '3' } });
    await screen.findByText('Jo Lee');

    fireEvent.click(screen.getByRole('button', { name: 'Going' }));

    await waitFor(() => expect(upsertRsvp).toHaveBeenCalledTimes(1));
    expect(upsertRsvp.mock.calls[0][0]).toMatchObject({ player_id: 1, schedule_id: 10 });
  });
});
