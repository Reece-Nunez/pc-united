import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const upsertRsvp = vi.fn();

// Heavy shell + navigation deps: render children straight through.
vi.mock('@/components/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/admin/Breadcrumbs', () => ({ default: () => null }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'parent@x.com', user_metadata: { full_name: 'Parent One' } } } }) },
  }),
}));

const approvedLink = (id: number, playerId: number, name: string) => ({
  id, player_id: playerId, status: 'approved', players: { id: playerId, name, teams: { name: 'U11' } },
});

vi.mock('@/lib/supabase', () => ({
  getParentChildrenForUser: async () => ({ data: [approvedLink(1, 1, 'Alex Kim'), approvedLink(2, 2, 'Sam Kim')], error: null }),
  getRoster: async () => ({ data: [], error: null }),
  getEvents: async () => ({ data: [], error: null }),
  getSchedule: async () => ({ data: [{ id: 10, game_date: '2030-01-01T18:00:00+00:00', home_game: true, opponent: 'Rivals', location: 'Field 1', team_id: 1 }], error: null }),
  getAttendanceForPlayers: async () => ({ data: [], error: null }),
  getDuesForPlayers: async () => ({ data: [], error: null }),
  upsertRsvp: (...args: unknown[]) => upsertRsvp(...args),
}));

import MyFamilyPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  upsertRsvp.mockResolvedValue({ error: null });
});

describe('My Family — bulk RSVP', () => {
  it('"Everyone" sets the RSVP for all approved children at once', async () => {
    render(<MyFamilyPage />);

    // Wait for the upcoming session to render.
    await screen.findByText('vs Rivals');

    // The "Everyone" bulk row appears because there are 2 linked children.
    const everyoneLabel = await screen.findByText('Everyone');
    const everyoneRow = everyoneLabel.parentElement as HTMLElement;
    const goingBtn = Array.from(everyoneRow.querySelectorAll('button')).find(b => b.textContent === 'Going')!;
    fireEvent.click(goingBtn);

    await waitFor(() => expect(upsertRsvp).toHaveBeenCalledTimes(2));
    const ids = upsertRsvp.mock.calls.map(c => c[0].player_id).sort();
    expect(ids).toEqual([1, 2]);
    for (const call of upsertRsvp.mock.calls) {
      expect(call[0]).toMatchObject({ schedule_id: 10, rsvp: 'going', rsvp_by: 'parent@x.com' });
    }
  });
});
