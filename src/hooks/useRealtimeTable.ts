'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

type RealtimeEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Subscribe to Postgres changes on one or more `public` tables and run a
 * callback (typically a refetch) whenever a row changes — so admin screens
 * update live instead of needing a manual page refresh.
 *
 * Notes for future readers:
 * - The table(s) must be in the `supabase_realtime` publication. See
 *   supabase/migrations/20260714_enable_realtime_admin_tables.sql.
 * - Realtime delivery is gated by RLS for the subscriber's role. The tables we
 *   use this on (admin_notifications, parent_children, event_attendance) have
 *   permissive `select ... using (true)` policies, so the anon key the browser
 *   client falls back to is sufficient — no admin JWT required for delivery.
 * - A burst of writes (e.g. a coach bulk-marking attendance) is debounced into
 *   a single refetch so we don't hammer the loader.
 */
export function useRealtimeTable(
  tables: string | string[],
  onChange: () => void,
  { event = '*', enabled = true }: { event?: RealtimeEvent; enabled?: boolean } = {},
) {
  // Keep the latest callback without re-subscribing on every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const list = Array.isArray(tables) ? tables : [tables];
  const key = list.join(',');

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), 250);
    };

    const channel = supabase.channel(`realtime:${key}`);
    for (const table of list) {
      channel.on(
        // @supabase/supabase-js overload for postgres CDC events.
        'postgres_changes' as never,
        { event, schema: 'public', table } as never,
        fire as never,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [key, event, enabled]);
}
