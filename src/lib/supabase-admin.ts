import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for server routes (cron jobs, webhooks) that
 * must read/write regardless of RLS. Never import from client components.
 */
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
