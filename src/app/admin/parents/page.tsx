'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { SkeletonTable } from '@/components/admin/Skeleton';
import toast from 'react-hot-toast';
import {
  getParentChildren, approveParentChildLink, setParentChildStatus, deleteParentChildLink,
  updatePlayer, getTeams, getRoster, createParentChildLink, ParentChild, Team, Player,
} from '@/lib/supabase';

interface ParentAccount { id: string; email: string; full_name: string; phone: string; role: string; }
import { logActivity } from '@/lib/audit';
import { createClient } from '@/lib/supabase-browser';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export default function ParentsPage() {
  const [links, setLinks] = useState<ParentChild[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<ParentAccount[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [linkParentId, setLinkParentId] = useState('');
  const [linkChildId, setLinkChildId] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetchData();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => { if (data?.user?.email) setUserEmail(data.user.email); });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [linksRes, teamsRes, rosterRes] = await Promise.all([getParentChildren(), getTeams(), getRoster()]);
      if (!linksRes.error) setLinks(linksRes.data || []);
      if (!teamsRes.error) setTeams(teamsRes.data || []);
      if (!rosterRes.error && rosterRes.data) setRoster(rosterRes.data);
      // Approved parent accounts (for the "link existing parent" tool).
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (Array.isArray(data.users)) setAccounts(data.users.filter((u: ParentAccount) => u.role === 'parent'));
      } catch { /* non-fatal */ }
    } catch {
      toast.error('Error loading parents');
    } finally {
      setLoading(false);
    }
  };

  // New parent signups and link requests land in parent_children — refresh live.
  useRealtimeTable('parent_children', fetchData);

  // Which players each parent is already linked to — a parent can have several
  // kids, so we don't hide already-linked parents; we just hide the specific
  // children they're already connected to.
  const childrenByParent = useMemo(() => {
    const m: Record<string, Set<number>> = {};
    links.forEach(l => { if (l.parent_user_id && l.player_id) (m[l.parent_user_id] ||= new Set<number>()).add(l.player_id); });
    return m;
  }, [links]);
  const availableChildren = roster.filter(p => !(linkParentId && childrenByParent[linkParentId]?.has(p.id)));

  const handleLinkExisting = async () => {
    if (!linkParentId || !linkChildId) { toast.error('Pick a parent and a child'); return; }
    const acct = accounts.find(a => a.id === linkParentId);
    if (!acct) return;
    setLinking(true);
    try {
      const { error } = await createParentChildLink({
        parent_user_id: acct.id,
        parent_name: acct.full_name,
        parent_email: acct.email,
        parent_phone: acct.phone,
        player_id: parseInt(linkChildId),
        status: 'approved',
      });
      if (error) throw new Error(error.message.includes('duplicate') ? 'That parent is already linked to this child.' : error.message);
      logActivity('create', 'parent_link', linkChildId, userEmail, { action: 'link_existing', parent: acct.full_name });
      toast.success(`Linked ${acct.full_name} to their child`);
      // Keep the parent selected + panel open so siblings can be added in a row.
      setLinkChildId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not link');
    } finally {
      setLinking(false);
    }
  };

  const filtered = useMemo(() => links.filter(l => {
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesTeam = teamFilter === 'All' || String(l.players?.team_id) === teamFilter;
    return matchesStatus && matchesTeam;
  }), [links, statusFilter, teamFilter]);

  const pendingCount = useMemo(() => links.filter(l => l.status === 'pending').length, [links]);

  const handleApprove = async (link: ParentChild) => {
    setBusyId(link.id);
    try {
      const { error } = await approveParentChildLink(link.id, userEmail);
      if (error) throw new Error(error.message);

      // Promote the parent account from pending_parent → parent (also emails them).
      if (link.parent_user_id) {
        fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: link.parent_user_id, role: 'parent' }),
        }).catch(() => {});
      }

      // If the parent uploaded a photo and the player has none, apply it.
      const player = link.players;
      if (link.child_photo_url && player && (!player.photo_url || player.photo_url === '/logo.png')) {
        await updatePlayer(player.id, { photo_url: link.child_photo_url });
      }

      logActivity('update', 'parent_link', link.id, userEmail, { action: 'approve', child: player?.name });
      toast.success(`Approved — ${link.parent_name || 'parent'} linked to ${player?.name || 'player'}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not approve');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (link: ParentChild) => {
    setBusyId(link.id);
    try {
      const { error } = await setParentChildStatus(link.id, 'rejected');
      if (error) throw new Error(error.message);
      logActivity('update', 'parent_link', link.id, userEmail, { action: 'reject' });
      toast.success('Link rejected');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not reject');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (link: ParentChild) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Delete this parent link?</span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await deleteParentChildLink(link.id);
              if (error) { toast.error(error.message); return; }
              logActivity('delete', 'parent_link', link.id, userEmail);
              toast.success('Link deleted');
              fetchData();
            }}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Delete
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const exportCSV = () => {
    if (filtered.length === 0) { toast.error('Nothing to export'); return; }
    const esc = (v: string) => {
      const s = v ?? '';
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Parent', 'Email', 'Phone', 'Child', 'Team', 'Status'];
    const rows = filtered.map(l => [
      esc(l.parent_name || ''), esc(l.parent_email || ''), esc(l.parent_phone || ''),
      esc(l.players?.name || ''), esc(l.players?.teams?.name || ''), esc(l.status),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parent-directory${teamFilter !== 'All' ? '-' + (teams.find(t => String(t.id) === teamFilter)?.name || '') : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${map[status] || ''}`}>{status}</span>;
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Parents</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Approve parent accounts and manage the contact directory
              {pendingCount > 0 && <span className="ml-2 text-yellow-600 font-medium">· {pendingCount} pending</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLink(!showLink)} className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              {showLink ? 'Cancel' : 'Link existing parent'}
            </button>
            <button onClick={exportCSV} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
              Export directory CSV
            </button>
          </div>
        </div>

        {showLink && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Link a parent to a child</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Connect an approved parent account to a player. A parent can be linked to multiple children — pick the parent, then each child (repeat for siblings).
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={linkParentId} onChange={e => { setLinkParentId(e.target.value); setLinkChildId(''); }}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">Select a parent…</option>
                {accounts.map(a => {
                  const n = childrenByParent[a.id]?.size || 0;
                  return <option key={a.id} value={a.id}>{a.full_name || a.email} ({a.email}){n > 0 ? ` — ${n} kid${n !== 1 ? 's' : ''} linked` : ''}</option>;
                })}
              </select>
              <select value={linkChildId} onChange={e => setLinkChildId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">Select their child…</option>
                {['U11', 'U12'].map(tn => availableChildren.some(p => p.teams?.name === tn) && (
                  <optgroup key={tn} label={tn}>
                    {availableChildren.filter(p => p.teams?.name === tn).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                ))}
                {availableChildren.filter(p => !p.teams).length > 0 && (
                  <optgroup label="Other">
                    {availableChildren.filter(p => !p.teams).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                )}
              </select>
              <button onClick={handleLinkExisting} disabled={linking}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 shrink-0">
                {linking ? 'Linking…' : 'Link'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {(['pending', 'approved', 'all'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${statusFilter === s ? 'bg-team-blue text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="All">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          {loading && links.length === 0 ? (
            <SkeletonTable rows={5} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
              No {statusFilter !== 'all' ? statusFilter : ''} parent links{teamFilter !== 'All' ? ' for this team' : ''}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Parent</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Child</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map(link => (
                    <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {link.child_photo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={link.child_photo_url} alt="Child" className="w-8 h-8 rounded-full object-cover" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{link.parent_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div>{link.parent_email || '—'}</div>
                        <div className="text-xs">{link.parent_phone || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {link.players?.name || '—'}
                        {link.players?.teams?.name && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{link.players.teams.name}</span>}
                      </td>
                      <td className="px-4 py-3">{statusBadge(link.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          {link.status !== 'approved' && (
                            <button disabled={busyId === link.id} onClick={() => handleApprove(link)}
                              className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 disabled:opacity-50">Approve</button>
                          )}
                          {link.status !== 'rejected' && (
                            <button disabled={busyId === link.id} onClick={() => handleReject(link)}
                              className="text-xs px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 disabled:opacity-50">Reject</button>
                          )}
                          <button onClick={() => handleDelete(link)}
                            className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
