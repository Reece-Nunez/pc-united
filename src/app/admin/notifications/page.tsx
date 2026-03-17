'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAdminNotification,
  AdminNotification,
} from '@/lib/supabase';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  email_notifications: boolean;
}

const typeColors: Record<string, string> = {
  registration: 'bg-green-100 text-green-800',
  sponsorship: 'bg-yellow-100 text-yellow-800',
  contact: 'bg-blue-100 text-blue-800',
  player: 'bg-indigo-100 text-indigo-800',
  highlight: 'bg-orange-100 text-orange-800',
  news: 'bg-teal-100 text-teal-800',
  gallery: 'bg-purple-100 text-purple-800',
  user_signup: 'bg-pink-100 text-pink-800',
  event: 'bg-cyan-100 text-cyan-800',
  schedule: 'bg-emerald-100 text-emerald-800',
  announcement: 'bg-amber-100 text-amber-800',
};

const roleColors: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

function relativeTime(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [recipients, setRecipients] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [notifRes, recipRes] = await Promise.all([
      getAdminNotifications(100),
      fetch('/api/admin/users').then((r) => r.json()).catch(() => ({ users: [] })),
    ]);
    if (notifRes.data) setNotifications(notifRes.data);
    const adminUsers = (recipRes.users || []).filter(
      (u: AdminUser) => u.role === 'admin' || u.role === 'approved'
    );
    setRecipients(adminUsers);
    setLoading(false);
  }

  const filtered = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.read) return false;
    if (filterRead === 'read' && !n.read) return false;
    return true;
  });

  const types = Array.from(new Set(notifications.map((n) => n.type)));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (id: number) => {
    await deleteAdminNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification deleted');
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(n => n.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium">Delete {count} notification{count > 1 ? 's' : ''}?</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setIsDeleting(true);
              for (const id of selectedIds) {
                await deleteAdminNotification(id);
              }
              setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
              setSelectedIds(new Set());
              setIsDeleting(false);
              toast.success(`Deleted ${count} notification${count > 1 ? 's' : ''}`);
            }}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const handleToggleEmailNotif = async (userId: string, current: boolean) => {
    setToggling(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email_notifications: !current }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setRecipients((prev) =>
          prev.map((u) => u.id === userId ? { ...u, email_notifications: !current } : u)
        );
        toast.success(`Email notifications ${!current ? 'enabled' : 'disabled'}`);
      }
    } catch {
      toast.error('Failed to update preference');
    } finally {
      setToggling(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Notifications</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">View alerts and manage email notification preferences.</p>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Notifications Section */}
            <div className="mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All types</option>
                    {types.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                  <select
                    value={filterRead}
                    onChange={(e) => setFilterRead(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread ({unreadCount})</option>
                    <option value="read">Read</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedIds.size > 0 && (
                    <>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {selectedIds.size} selected
                      </span>
                      <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
                      </button>
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-sm text-team-blue hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No notifications</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-team-blue focus:ring-team-blue cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer" onClick={toggleSelectAll}>Select All</span>
                  </div>
                  {filtered.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 p-4 ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${selectedIds.has(notif.id) ? 'ring-2 ring-inset ring-team-blue' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notif.id)}
                        onChange={() => toggleSelect(notif.id)}
                        className="w-4 h-4 rounded border-gray-300 text-team-blue focus:ring-team-blue cursor-pointer mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${typeColors[notif.type] || 'bg-gray-100 text-gray-800'}`}>
                            {notif.type}
                          </span>
                          <span className="text-xs text-gray-400">{relativeTime(notif.created_at)}</span>
                        </div>
                        <p className={`text-sm break-words ${!notif.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{notif.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="text-xs text-team-blue hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Recipients Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Notifications</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Admin and approved users receive emails for new registrations, contact forms, and sponsorship requests.
                Toggle off to stop receiving emails. Manage users from the{' '}
                <Link href="/admin/users" className="text-team-blue hover:underline font-medium">Users page</Link>.
              </p>

              {recipients.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No admin or approved users found.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Role</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">Email Alerts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {recipients.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{u.full_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                              {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggleEmailNotif(u.id, u.email_notifications)}
                              disabled={toggling === u.id}
                              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
                              style={{ backgroundColor: u.email_notifications ? '#22c55e' : '#d1d5db' }}
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                  u.email_notifications ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
