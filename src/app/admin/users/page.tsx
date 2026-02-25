'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { createAdminNotification } from '@/lib/supabase';
import { logActivity } from '@/lib/audit';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'pending' | 'pending_parent' | 'approved' | 'admin' | 'parent';
  created_at: string;
  last_sign_in_at: string | null;
}

const roleColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_parent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  parent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const userEmail = useCurrentUser();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setUsers(data.users);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      approved: 'Approved Coach',
      parent: 'Parent',
      pending: 'Pending',
      pending_parent: 'Pending Parent',
    };
    return labels[role] || role;
  };

  const updateRole = async (userId: string, role: string) => {
    const user = users.find((u) => u.id === userId);
    const userName = user?.full_name || user?.email || 'Unknown user';
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`User ${role === 'approved' ? 'approved' : 'updated'}!`);
        const roleLabel = getRoleLabel(role);
        logActivity('update', 'user', userName, userEmail, { name: userName, email: user?.email, newRole: roleLabel });
        createAdminNotification({ type: 'user_signup', title: `${userName} — Role Changed`, message: `${userName}'s role was changed to ${roleLabel}.`, link: '/admin/users' });
        fetchUsers();
      }
    } catch {
      toast.error('Failed to update user');
    } finally {
      setUpdating(null);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    const user = users.find((u) => u.id === userId);
    const userName = user?.full_name || email;
    if (!confirm(`Remove ${userName} (${email})? This cannot be undone.`)) return;
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('User removed');
        logActivity('delete', 'user', userName, userEmail, { name: userName, email });
        createAdminNotification({ type: 'user_signup', title: `User Removed: ${userName}`, message: `${userName} (${email}) was removed from the system.`, link: '/admin/users' });
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch {
      toast.error('Failed to remove user');
    } finally {
      setUpdating(null);
    }
  };

  const pending = users.filter((u) => u.role === 'pending' || u.role === 'pending_parent');
  const active = users.filter((u) => u.role !== 'pending' && u.role !== 'pending_parent');

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Approve new signups and manage admin access.</p>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading users...</div>
        ) : (
          <>
            {/* Pending Approvals */}
            {pending.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
                  Pending Approval ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((user) => (
                    <div key={user.id} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.full_name || 'No name'}
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            user.role === 'pending_parent'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {user.role === 'pending_parent' ? 'Parent' : 'Coach'}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Signed up {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => updateRole(user.id, user.role === 'pending_parent' ? 'parent' : 'approved')}
                          disabled={updating === user.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {updating === user.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          disabled={updating === user.id}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Users */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Active Users ({active.length})
              </h2>
              {active.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No active users yet.</p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Role</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Last Sign In</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {active.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                            {user.full_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={user.role}
                              onChange={(e) => updateRole(user.id, e.target.value)}
                              disabled={updating === user.id}
                              className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${roleColors[user.role] || ''}`}
                            >
                              <option value="approved">Approved</option>
                              <option value="admin">Admin</option>
                              <option value="parent">Parent</option>
                              <option value="pending">Pending</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {user.last_sign_in_at
                              ? new Date(user.last_sign_in_at).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => deleteUser(user.id, user.email)}
                              disabled={updating === user.id}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            >
                              Remove
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
