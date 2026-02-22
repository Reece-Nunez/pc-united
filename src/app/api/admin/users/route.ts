import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses the service role key to manage users — server-side only
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET: List all users
export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || '',
      role: u.user_metadata?.role || 'pending',
      email_notifications: u.user_metadata?.email_notifications !== false,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update user role or email_notifications preference
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, email_notifications } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const metadata: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!['pending', 'pending_parent', 'approved', 'admin', 'parent'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      metadata.role = role;
    }

    if (email_notifications !== undefined) {
      metadata.email_notifications = !!email_notifications;
    }

    if (Object.keys(metadata).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
