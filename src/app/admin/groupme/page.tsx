'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { SkeletonTable } from '@/components/admin/Skeleton';
import { getTeams, type Team } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ActivityEntry {
  id: number;
  kind: string;
  bot_key: string;
  team_id: number | null;
  item_kind: string | null;
  item_id: number | null;
  message: string;
  ok: boolean;
  error: string | null;
  created_at: string;
}

const KIND_STYLES: Record<string, string> = {
  reminder: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancellation: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  command_reply: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  calendar_create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  calendar_update: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  calendar_cancel: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  test: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// Chat posts and calendar writes are different kinds of action; label them so
// the list doesn't read as if the bot said "Added calendar event" out loud.
const KIND_LABELS: Record<string, string> = {
  reminder: 'reminder',
  cancellation: 'cancellation',
  command_reply: 'command reply',
  calendar_create: 'calendar · added',
  calendar_update: 'calendar · updated',
  calendar_cancel: 'calendar · cancelled',
  test: 'test',
};

export default function GroupMeActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [res, teamsRes] = await Promise.all([fetch('/api/admin/groupme-activity'), getTeams()]);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setEntries(json.entries || []);
      if (!teamsRes.error) setTeams(teamsRes.data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const groupLabel = (e: ActivityEntry) =>
    e.team_id == null ? 'All groups' : teams.find(t => t.id === e.team_id)?.name || `Team ${e.team_id}`;

  const filtered = useMemo(() => entries.filter(e =>
    (kindFilter === 'all' || e.kind === kindFilter) &&
    (groupFilter === 'all' || String(e.team_id ?? 'all') === groupFilter)
  ), [entries, kindFilter, groupFilter]);

  const failures = useMemo(() => entries.filter(e => !e.ok).length, [entries]);

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">GroupMe activity</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Every message the bots posted and every calendar event they wrote, and where it went.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* A failure is a message nobody saw, or a calendar event silently out
            of date — surface it rather than leaving it buried in the list. */}
        {!loading && failures > 0 && (
          <div className="rounded-xl border border-red-300/70 dark:border-red-500/30 bg-red-50/60 dark:bg-red-900/10 p-4 mb-6">
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">
              {failures} action{failures !== 1 ? 's' : ''} failed
            </p>
            <p className="text-xs text-red-700/80 dark:text-red-300/70 mt-1">
              These never reached GroupMe — the message wasn&apos;t delivered, or the calendar
              event wasn&apos;t written. See the error on each entry below.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={kindFilter}
            onChange={e => setKindFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
          >
            <option value="all">All types</option>
            <option value="reminder">Reminders</option>
            <option value="cancellation">Cancellations</option>
            <option value="command_reply">Command replies</option>
            <option value="calendar_create">Calendar · added</option>
            <option value="calendar_update">Calendar · updated</option>
            <option value="calendar_cancel">Calendar · cancelled</option>
            <option value="test">Tests</option>
          </select>
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
          >
            <option value="all">All groups</option>
            {teams.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center ml-1">
            {filtered.length} of {entries.length}
          </span>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Nothing yet. Reminders run at 6 PM and 8 AM club time; the calendar sync runs at 7 AM.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No messages match these filters.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(e => (
                <li key={e.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded ${KIND_STYLES[e.kind] || KIND_STYLES.test}`}>
                        {KIND_LABELS[e.kind] || e.kind.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{groupLabel(e)}</span>
                      {!e.ok && (
                        <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          failed
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {new Date(e.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white mt-2 break-words">{e.message}</p>
                  {e.error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{e.error}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
