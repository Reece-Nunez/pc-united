import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// medical_forms holds sensitive PII and is default-deny under RLS (see
// supabase/migrations/20260707_harden_medical_forms_rls.sql). Admin CRUD runs here
// with the service-role key, gated by a cookie-based auth check, so the anon key can
// never read or mutate the table directly.

const SELECT = '*, players(id, name, jersey_number)';

// Service-role client bypasses RLS — server-side only, never exposed to the browser.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Mirrors middleware.ts: only approved coaches/admins may touch medical forms.
// (Parents are never routed to /admin/medical-forms.) Returns null when unauthorized.
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'approved' && role !== 'admin') return null;
  return user;
}

// GET — list all forms for the admin table.
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const admin = getServiceClient();
    const { data, error } = await admin
      .from('medical_forms')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a blank form request for a player; the DB default generates the token.
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = await request.json();
    // Whitelist the columns the admin UI sets when generating a request.
    const row = {
      player_id: input.player_id ?? null,
      player_name: input.player_name ?? null,
      season: input.season ?? null,
      created_by: input.created_by ?? null,
      sent_to_phone: input.sent_to_phone ?? null,
      status: 'sent',
    };
    const admin = getServiceClient();
    const { data, error } = await admin
      .from('medical_forms')
      .insert([row])
      .select(SELECT)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — admin-side updates (e.g. recording the phone the link was texted to).
export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const admin = getServiceClient();
    const { data, error } = await admin
      .from('medical_forms')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a form. id comes in as a query param.
export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const admin = getServiceClient();
    const { error } = await admin.from('medical_forms').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
