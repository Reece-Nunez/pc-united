'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import toast from 'react-hot-toast';
import { getTeams, createTeam, updateTeam, deleteTeam, getPlayers, Team, Player } from '@/lib/supabase';
import { logActivity } from '@/lib/audit';
import { createClient } from '@/lib/supabase-browser';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

interface TeamForm {
  name: string;
  season: string;
  description: string;
  sort_order: string;
  active: boolean;
}

const emptyForm: TeamForm = { name: '', season: '', description: '', sort_order: '0', active: true };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, playersRes] = await Promise.all([getTeams(), getPlayers()]);
      if (!teamsRes.error) setTeams(teamsRes.data || []);
      if (!playersRes.error) setPlayers((playersRes.data as Player[]) || []);
    } catch {
      toast.error('Error loading teams');
    } finally {
      setLoading(false);
    }
  };

  const countByTeam = useMemo(() => {
    const map: Record<number, number> = {};
    players.forEach(p => { if (p.team_id) map[p.team_id] = (map[p.team_id] || 0) + 1; });
    return map;
  }, [players]);

  const unassigned = useMemo(() => players.filter(p => !p.team_id).length, [players]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.name),
        season: form.season || undefined,
        description: form.description || undefined,
        sort_order: parseInt(form.sort_order || '0', 10) || 0,
        active: form.active,
      };
      if (editing) {
        const { error } = await updateTeam(editing.id, payload);
        if (error) throw new Error(error.message);
        toast.success('Team updated');
        logActivity('update', 'team', editing.id, userEmail, { name: payload.name });
        setEditing(null);
      } else {
        const { data, error } = await createTeam(payload);
        if (error) throw new Error(error.message);
        toast.success('Team created');
        logActivity('create', 'team', data?.id || payload.name, userEmail, { name: payload.name });
      }
      setForm(emptyForm);
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Could not save team');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditing(team);
    setForm({
      name: team.name,
      season: team.season || '',
      description: team.description || '',
      sort_order: String(team.sort_order ?? 0),
      active: team.active ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = (team: Team) => {
    const count = countByTeam[team.id] || 0;
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Delete {team.name}?{count > 0 && ` ${count} player${count !== 1 ? 's' : ''} will become unassigned.`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await deleteTeam(team.id);
              if (error) { toast.error(error.message); return; }
              logActivity('delete', 'team', team.id, userEmail, { name: team.name });
              toast.success('Team deleted');
              fetchData();
            }}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Delete
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const cancelEdit = () => { setEditing(null); setForm(emptyForm); setShowForm(false); };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage age-group teams (U11, U12, …)</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); if (editing) cancelEdit(); }}
            className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Add Team'}
          </button>
        </div>

        {unassigned > 0 && (
          <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-300">
            {unassigned} player{unassigned !== 1 ? 's are' : ' is'} not yet assigned to a team. Set each player&apos;s team on the{' '}
            <a href="/admin/players" className="underline font-medium">Players</a> page.
          </div>
        )}

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? 'Edit Team' : 'Add Team'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={form.name} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="U11" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Season</label>
                  <input type="text" value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))}
                    placeholder="Spring 2026" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display order</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description} rows={2} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-team-blue focus:ring-team-blue" />
                Active
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="bg-team-blue text-white py-2 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {editing ? 'Update Team' : 'Add Team'}
                </button>
                {editing && <button type="button" onClick={cancelEdit} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm">Cancel</button>}
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          {loading && teams.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : teams.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No teams yet. Add your first team.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {teams.map(team => (
                <div key={team.id} className="flex items-center justify-between p-4 md:p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{team.name}</p>
                      {!team.active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {countByTeam[team.id] || 0} player{(countByTeam[team.id] || 0) !== 1 ? 's' : ''}
                      {team.season ? ` · ${team.season}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(team)} className="text-sm px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100">Edit</button>
                    <button onClick={() => handleDelete(team)} className="text-sm px-3 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
