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

// Realistic team names — the club uses "U11 Competitive"/"U12 Competitive",
// not bare "U11"/"U12". The dropdown must group by whatever names exist.
const roster = [
  { id: 1, name: 'Alex Kim', team_id: 1, teams: { name: 'U11 Competitive' } },
  { id: 2, name: 'Sam Kim', team_id: 1, teams: { name: 'U11 Competitive' } },
  { id: 3, name: 'Jo Lee', team_id: 2, teams: { name: 'U12 Competitive' } },
] as never;

const games = [
  { id: 10, game_date: '2030-01-01T18:00:00+00:00', home_game: true, opponent: 'Rivals', location: 'Field 1', team_id: 1 },
] as never;

beforeEach(() => {
  vi.clearAllMocks();
  getAttendanceForPlayers.mockResolvedValue({ data: [] });
  upsertRsvp.mockResolvedValue({ error: null });
});

describe('RsvpClient player dropdown', () => {
  it('lists every active player grouped by their real team name', () => {
    // Regression: the dropdown hardcoded ['U11','U12'] optgroups, so players on
    // "U11 Competitive"/"U12 Competitive" (and any other team name) rendered
    // nothing and could not be selected.
    render(<RsvpClient roster={roster} events={[] as never} games={games} />);
    expect(screen.getByRole('option', { name: 'Alex Kim' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Sam Kim' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Jo Lee' })).toBeTruthy();
    // Grouped under the actual team names.
    const groups = Array.from(document.querySelectorAll('optgroup')).map(g => g.label);
    expect(groups).toContain('U11 Competitive');
    expect(groups).toContain('U12 Competitive');
  });

  it('hides inactive players from the dropdown', () => {
    const withInactive = [
      ...(roster as unknown as Record<string, unknown>[]),
      { id: 4, name: 'Old Grad', team_id: 1, status: 'inactive', teams: { name: 'U11 Competitive' } },
    ] as never;
    render(<RsvpClient roster={withInactive} events={[] as never} games={games} />);
    expect(screen.queryByRole('option', { name: 'Old Grad' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Alex Kim' })).toBeTruthy();
  });
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
