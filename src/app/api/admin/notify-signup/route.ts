import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { createClient } from '@supabase/supabase-js';

async function getAdminEmails(): Promise<string[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return [];

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await admin.auth.admin.listUsers();
    if (!data?.users) return [];

    return data.users
      .filter((u) => {
        const role = u.user_metadata?.role;
        const emailNotifs = u.user_metadata?.email_notifications;
        return (role === 'admin' || role === 'approved') && u.email && emailNotifs !== false;
      })
      .map((u) => u.email!);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, accountType } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const typeLabel = accountType === 'parent' ? 'Parent' : 'Coach';
    const adminEmails = await getAdminEmails();

    if (adminEmails.length === 0) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const { error } = await resend.emails.send({
      from: 'Ponca City United FC <noreply@poncacityunited.com>',
      to: adminEmails,
      subject: `New ${typeLabel} Signup: ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">New Account Signup</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px; font-size: 16px; color: #374151;">
              A new <strong>${typeLabel.toLowerCase()}</strong> has signed up and is waiting for approval.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Name:</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Type:</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${typeLabel}</td>
              </tr>
            </table>
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://www.poncacityunited.com/admin/users"
                style="background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Review & Approve
              </a>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send signup notification email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Signup notification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
