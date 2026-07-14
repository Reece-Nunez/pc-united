import { describe, it, expect, vi, beforeEach } from 'vitest';

// The route imports these at module load. `@/lib/resend` throws at import time
// when RESEND_API_KEY is unset, so it must be mocked before the route is imported.
// vi.hoisted lets the mock factories (hoisted to the top) reference these fns.
const { getUserById, updateUserById, emailSend } = vi.hoisted(() => ({
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  emailSend: vi.fn(),
}));

vi.mock('@/lib/resend', () => ({
  resend: { emails: { send: emailSend } },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        getUserById,
        updateUserById,
        listUsers: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  }),
}));

// getAdminClient() reads these env vars and throws if they're missing.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

import { PATCH } from './route';

/** Minimal stand-in for NextRequest — the handler only calls `.json()`. */
function mockReq(body: unknown) {
  return { json: async () => body } as unknown as import('next/server').NextRequest;
}

/** Make getUserById resolve with a user carrying the given role. */
function userWithRole(role: string | undefined) {
  getUserById.mockResolvedValue({
    data: { user: { email: 'user@example.com', user_metadata: { role, full_name: 'Test User' } } },
  });
}

describe('PATCH /api/admin/users — role guard', () => {
  beforeEach(() => {
    getUserById.mockReset();
    updateUserById.mockReset();
    updateUserById.mockResolvedValue({ error: null });
    emailSend.mockClear();
  });

  it('does NOT demote an admin to parent (the self-linked-child bug)', async () => {
    userWithRole('admin');

    const res = await PATCH(mockReq({ userId: 'u1', role: 'parent' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    // The admin's role must be left untouched — no write at all here.
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('does NOT demote an approved coach to parent', async () => {
    userWithRole('approved');

    await PATCH(mockReq({ userId: 'u1', role: 'parent' }));

    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('still applies email_notifications when a parent demotion is blocked', async () => {
    userWithRole('admin');

    await PATCH(mockReq({ userId: 'u1', role: 'parent', email_notifications: false }));

    // Role is stripped from the update, but the other field goes through.
    expect(updateUserById).toHaveBeenCalledWith('u1', {
      user_metadata: { email_notifications: false },
    });
  });

  it('promotes a pending_parent to parent (the intended approval flow)', async () => {
    userWithRole('pending_parent');

    await PATCH(mockReq({ userId: 'u1', role: 'parent' }));

    expect(updateUserById).toHaveBeenCalledWith('u1', {
      user_metadata: { role: 'parent' },
    });
  });

  it('allows non-demotion role changes (e.g. pending -> admin)', async () => {
    userWithRole('pending');

    await PATCH(mockReq({ userId: 'u1', role: 'admin' }));

    expect(updateUserById).toHaveBeenCalledWith('u1', {
      user_metadata: { role: 'admin' },
    });
  });

  it('rejects an unknown role with 400', async () => {
    userWithRole('admin');

    const res = await PATCH(mockReq({ userId: 'u1', role: 'superuser' }));

    expect(res.status).toBe(400);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('requires a userId', async () => {
    const res = await PATCH(mockReq({ role: 'admin' }));

    expect(res.status).toBe(400);
    expect(getUserById).not.toHaveBeenCalled();
  });
});
