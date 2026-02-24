'use client';

import { useState, useEffect, Suspense } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getRecentActivity } from '@/lib/audit';

interface ActivityEntry {
  id: number;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  user_email: string;
  details: Record<string, any> | null;
  created_at: string;
}

const ENTITY_TYPES = [
  'all',
  'player',
  'highlight',
  'news',
  'event',
  'schedule',
  'announcement',
  'gallery_image',
] as const;

const ACTIONS = ['all', 'create', 'update', 'delete'] as const;

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

function formatEntityType(entityType: string): string {
  return entityType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function describeActivity(entry: ActivityEntry): string {
  const actionVerb =
    entry.action === 'create'
      ? 'Added'
      : entry.action === 'update'
        ? 'Updated'
        : 'Deleted';
  const entityLabel = formatEntityType(entry.entity_type);

  // Use the title/name from details if available, otherwise fall back to entity_id
  const name =
    entry.details?.title ||
    entry.details?.name ||
    entry.details?.player ||
    null;

  if (name) {
    return `${actionVerb} ${entityLabel}: "${name}"`;
  }

  // If entity_id looks like a readable name (not purely numeric), use it
  if (entry.entity_id && !/^\d+$/.test(entry.entity_id)) {
    return `${actionVerb} ${entityLabel}: "${entry.entity_id}"`;
  }

  return `${actionVerb} a ${entityLabel.toLowerCase()}`;
}

function formatDetailsHuman(details: Record<string, any>): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined) continue;
    const label = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`${label}: ${value}`);
  }
  return lines;
}

function ActionIcon({ action }: { action: 'create' | 'update' | 'delete' }) {
  if (action === 'create') {
    return (
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </div>
    );
  }

  if (action === 'update') {
    return (
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
      <svg
        className="w-5 h-5 text-red-600 dark:text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </div>
  );
}

function ActionBadge({ action }: { action: 'create' | 'update' | 'delete' }) {
  const styles = {
    create:
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    update:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[action]}`}
    >
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </span>
  );
}

function EntityBadge({ entityType }: { entityType: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {formatEntityType(entityType)}
    </span>
  );
}

function Content() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchActivity();
  }, []);

  async function fetchActivity() {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await getRecentActivity(100);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setActivities((data as ActivityEntry[]) || []);
      }
    } catch (err) {
      setError('Failed to fetch activity log');
    } finally {
      setLoading(false);
    }
  }

  function toggleDetails(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filteredActivities = activities.filter((entry) => {
    const matchesEntity =
      entityFilter === 'all' || entry.entity_type === entityFilter;
    const matchesAction =
      actionFilter === 'all' || entry.action === actionFilter;
    return matchesEntity && matchesAction;
  });

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Activity Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Audit trail of all changes made in the admin panel
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entity Type
              </label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Entity Types' : formatEntityType(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action === 'all'
                      ? 'All Actions'
                      : action.charAt(0).toUpperCase() + action.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchActivity}
                className="px-4 py-2 bg-team-blue hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Showing {filteredActivities.length} of {activities.length} entries
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading activity log...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              Error Loading Activity
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchActivity}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredActivities.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No activity recorded yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {entityFilter !== 'all' || actionFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Activity will appear here as changes are made in the admin panel.'}
            </p>
          </div>
        )}

        {/* Activity Timeline */}
        {!loading && !error && filteredActivities.length > 0 && (
          <div className="space-y-1">
            {filteredActivities.map((entry, index) => {
              const isExpanded = expandedIds.has(entry.id);
              const hasDetails =
                entry.details &&
                typeof entry.details === 'object' &&
                Object.keys(entry.details).length > 0;

              return (
                <div key={entry.id} className="relative">
                  {/* Timeline connector line */}
                  {index < filteredActivities.length - 1 && (
                    <div className="absolute left-9 top-14 bottom-0 w-px bg-gray-200 dark:bg-gray-700 -mb-1" />
                  )}

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Left: Action Icon */}
                      <ActionIcon action={entry.action} />

                      {/* Center: Description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                            {describeActivity(entry)}
                          </span>
                          <ActionBadge action={entry.action} />
                          <EntityBadge entityType={entry.entity_type} />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          by{' '}
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {entry.user_email}
                          </span>
                        </p>

                        {/* Expandable Details */}
                        {hasDetails && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleDetails(entry.id)}
                              className="text-xs text-team-blue dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              {isExpanded ? 'Hide details' : 'Show details'}
                            </button>
                            {isExpanded && entry.details && (
                              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                {formatDetailsHuman(entry.details).map((line, i) => (
                                  <p key={i}>{line}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Relative Time */}
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatRelativeTime(entry.created_at)}
                        </span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(entry.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </AdminLayout>
      }
    >
      <Content />
    </Suspense>
  );
}
