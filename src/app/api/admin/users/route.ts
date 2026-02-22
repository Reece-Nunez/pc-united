import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/resend';

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

    // Look up the user before updating so we can send them an email
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const previousRole = userData?.user?.user_metadata?.role;

    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send approval email when a pending user gets approved
    const approvedRoles = ['approved', 'admin', 'parent'];
    const pendingRoles = ['pending', 'pending_parent'];
    if (
      role &&
      approvedRoles.includes(role) &&
      pendingRoles.includes(previousRole) &&
      userData?.user?.email
    ) {
      const userName = userData.user.user_metadata?.full_name || 'there';
      const roleLabel = role === 'parent' ? 'Parent' : role === 'admin' ? 'Admin' : 'Coach';
      try {
        await resend.emails.send({
          from: 'Ponca City United FC <noreply@poncacityunited.com>',
          to: userData.user.email,
          subject: 'Your Account Has Been Approved!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 22px;">Welcome to Ponca City United FC!</h1>
              </div>
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="margin: 0 0 16px; font-size: 16px; color: #374151;">
                  Hi ${userName},
                </p>
                <p style="margin: 0 0 16px; font-size: 16px; color: #374151;">
                  Great news! Your <strong>${roleLabel}</strong> account has been approved. You can now sign in and access the dashboard.
                </p>
                <div style="margin: 24px 0; text-align: center;">
                  <a href="https://www.poncacityunited.com/admin/login"
                    style="background: #1e3a5f; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                    Sign In Now
                  </a>
                </div>
                <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                  If you have any questions, contact a team admin.
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        // Don't fail the approval if the email fails
        console.error('Failed to send approval email:', emailErr);
      }
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
