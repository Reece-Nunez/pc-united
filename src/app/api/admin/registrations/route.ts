import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Admin-only read of registrations, which hold PII (parent contact + medical info).
// RLS now blocks the anon key from SELECTing this table
// (see supabase/migrations/20260708_harden_registrations_rls.sql), so reads must
// use the service role — which bypasses RLS. Because /api/admin/* is NOT covered
// by middleware.ts, this route must verify the caller itself; without that check
// the service-role read would re-expose every registrant.
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET: List all registrations (admins/coaches only)
export async function GET() {
  try {
    // Gate on an authenticated coach/admin. Parents must not see registration PII,
    // so 'parent' and unauthenticated callers are rejected.
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;

    if (!user || (role !== 'approved' && role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getServiceRoleClient();
    const { data, error } = await admin
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ registrations: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
