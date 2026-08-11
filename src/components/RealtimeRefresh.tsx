'use client';

import { useRouter } from 'next/navigation';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

/**
 * Drop-in live updater for server-rendered pages. Subscribes to Postgres changes
 * on the given table(s) and calls router.refresh() when a row changes, so a
 * `force-dynamic` / server-component page re-pulls its data in place — no manual
 * refresh, and without converting the page to a client component (keeps SSR/SEO).
 *
 * Renders nothing. Use it on server pages that fetch server-side; client pages
 * that fetch in their own useEffect should call useRealtimeTable directly with
 * their refetch instead.
 */
export default function RealtimeRefresh({ tables }: { tables: string | string[] }) {
  const router = useRouter();
  useRealtimeTable(tables, () => router.refresh());
  return null;
}
