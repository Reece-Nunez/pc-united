'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import DataTable, { Column } from '@/components/admin/DataTable';
import {
  getNewsletterSubscribers,
  updateNewsletterSubscriber,
  deleteNewsletterSubscriber,
  NewsletterSubscriber,
  createAdminNotification,
} from '@/lib/supabase';
import { logActivity } from '@/lib/audit';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function Content() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const userEmail = useCurrentUser();

  const fetchSubscribers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getNewsletterSubscribers();
      if (error) {
        toast.error('Failed to load subscribers: ' + error.message);
      } else if (data) {
        setSubscribers(data);
      }
    } catch {
      toast.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleToggleActive = async (subscriber: NewsletterSubscriber) => {
    const newActive = !subscriber.active;

    // Optimistic update
    setSubscribers((prev) =>
      prev.map((s) => (s.id === subscriber.id ? { ...s, active: newActive } : s))
    );
    setTogglingIds((prev) => new Set(prev).add(subscriber.id));

    try {
      const { error } = await updateNewsletterSubscriber(subscriber.id, {
        active: newActive,
      });
      if (error) {
        // Revert on failure
        setSubscribers((prev) =>
          prev.map((s) =>
            s.id === subscriber.id ? { ...s, active: !newActive } : s
          )
        );
        toast.error('Failed to update subscriber: ' + error.message);
      } else {
        toast.success(
          `Subscriber ${newActive ? 'activated' : 'deactivated'}`
        );
        logActivity('update', 'newsletter_subscriber', subscriber.id, userEmail);
      }
    } catch {
      setSubscribers((prev) =>
        prev.map((s) =>
          s.id === subscriber.id ? { ...s, active: !newActive } : s
        )
      );
      toast.error('Failed to update subscriber');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(subscriber.id);
        return next;
      });
    }
  };

  const handleDelete = async (subscriber: NewsletterSubscriber) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the subscriber "${subscriber.email}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const { error } = await deleteNewsletterSubscriber(subscriber.id);
      if (error) {
        toast.error('Failed to delete subscriber: ' + error.message);
      } else {
        setSubscribers((prev) => prev.filter((s) => s.id !== subscriber.id));
        toast.success('Subscriber deleted');
        logActivity('delete', 'newsletter_subscriber', subscriber.id, userEmail);
      }
    } catch {
      toast.error('Failed to delete subscriber');
    }
  };

  const totalCount = subscribers.length;
  const activeCount = subscribers.filter((s) => s.active).length;

  const columns: Column<NewsletterSubscriber>[] = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (subscriber) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {subscriber.email}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Subscribed Date',
      sortable: true,
      render: (subscriber) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(subscriber.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'active',
      label: 'Active',
      sortable: true,
      render: (subscriber) => (
        <button
          type="button"
          role="switch"
          aria-checked={subscriber.active}
          aria-label={`Toggle active status for ${subscriber.email}`}
          disabled={togglingIds.has(subscriber.id)}
          onClick={() => handleToggleActive(subscriber)}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-team-blue focus:ring-offset-2
            dark:focus:ring-offset-gray-800
            disabled:opacity-50 disabled:cursor-not-allowed
            ${subscriber.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${subscriber.active ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading subscribers...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Newsletter Subscribers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your newsletter mailing list
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Subscribers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscribers</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCount}</p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable<NewsletterSubscriber>
          data={subscribers}
          columns={columns}
          keyField="id"
          onDelete={handleDelete}
          searchable
          searchPlaceholder="Search by email..."
          pageSize={25}
        />
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </AdminLayout>
      }
    >
      <Content />
    </Suspense>
  );
}
