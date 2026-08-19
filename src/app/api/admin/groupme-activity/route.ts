import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// groupme_activity_log is default-deny under RLS, so the admin UI reads it
// through this service-role route rather than straight from the browser.
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'approved' && role !== 'admin') return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('groupme_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load' }, { status: 500 });
  }
}
