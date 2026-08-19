'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { SkeletonTable } from '@/components/admin/Skeleton';
import toast from 'react-hot-toast';

interface Member { user_id: string; nickname?: string; name?: string; groups?: string[] }
interface Mapping { groupme_user_id: string; parent_user_id: string | null; player_id: number | null; ignored: boolean }
interface ParentLink { parent_user_id: string | null; parent_name: string | null; player_id: number; status: string }
interface Player { id: number; name: string; team_id: number | null }
interface Team { id: number; name: string }
interface Suggestion {
  member: Member;
  displayName: string;
  suggestedParents: { parentUserId: string; parentName: string; playerIds: number[] }[];
  suggestedPlayers: Player[];
  confident: boolean;
}

export default function GroupMeMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [parents, setParents] = useState<ParentLink[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showMapped, setShowMapped] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/groupme-members');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setMembers(json.members || []);
      setMappings(json.mappings || []);
      setSuggestions(json.suggestions || []);
      setParents(json.parents || []);
      setPlayers(json.players || []);
      setTeams(json.teams || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /** One entry per parent, from the approved links. */
  const parentOptions = useMemo(() => {
    const m = new Map<string, { id: string; name: string; playerIds: number[] }>();
    for (const l of parents) {
      if (l.status !== 'approved' || !l.parent_user_id) continue;
      const e = m.get(l.parent_user_id) || { id: l.parent_user_id, name: l.parent_name || '(unnamed)', playerIds: [] };
      e.playerIds.push(l.player_id);
      m.set(l.parent_user_id, e);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [parents]);

  const mapOf = useMemo(() => new Map(mappings.map(m => [m.groupme_user_id, m])), [mappings]);
  const playerName = (id: number) => players.find(p => p.id === id)?.name || `Player ${id}`;
  const teamName = (id: number | null) => teams.find(t => t.id === id)?.name || '';

  const save = async (member: Member, patch: { parent_user_id?: string | null; player_id?: number | null; ignored?: boolean }) => {
    setSaving(member.user_id);
    try {
      const res = await fetch('/api/admin/groupme-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupme_user_id: member.user_id,
          groupme_name: member.nickname || member.name,
          parent_user_id: patch.parent_user_id ?? null,
          player_id: patch.player_id ?? null,
          ignored: patch.ignored ?? false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      toast.success('Saved');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  const unmapped = members.filter(m => !mapOf.has(m.user_id));
  const mapped = members.filter(m => mapOf.has(m.user_id));
  const suggestionFor = (id: string) => suggestions.find(s => s.member.user_id === id);

  const describeMapping = (m: Mapping) => {
    if (m.ignored) return 'Not on the roster';
    if (m.player_id != null) return `→ ${playerName(m.player_id)}`;
    const p = parentOptions.find(o => o.id === m.parent_user_id);
    return p ? `→ ${p.name} (${p.playerIds.map(playerName).join(', ')})` : '→ (unknown parent)';
  };

  const renderRow = (member: Member) => {
    const existing = mapOf.get(member.user_id);
    const s = suggestionFor(member.user_id);
    const label = member.nickname || member.name || member.user_id;
    return (
      <li key={member.user_id} className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
            {(member.groups || []).map(g => (
              <span key={g} className="text-[10px] uppercase tracking-wide text-gray-500 bg-gray-100 dark:bg-gray-700 rounded px-1 py-0.5">
                {teamName(Number(g)) || `team ${g}`}
              </span>
            ))}
            {existing && (
              <span className={`text-xs ${existing.ignored ? 'text-gray-400' : 'text-green-600 dark:text-green-400'}`}>
                {describeMapping(existing)}
              </span>
            )}
          </div>
          {s?.confident && !existing && (
            <button
              type="button"
              disabled={saving === member.user_id}
              onClick={() => save(member, { parent_user_id: s.suggestedParents[0].parentUserId })}
              className="text-xs bg-team-blue text-white px-2.5 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Accept: {s.suggestedParents[0].parentName}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={existing?.parent_user_id || ''}
            disabled={saving === member.user_id}
            onChange={e => save(member, { parent_user_id: e.target.value || null })}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-xs"
          >
            <option value="">— link to parent —</option>
            {parentOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.playerIds.map(playerName).join(', ')})</option>
            ))}
          </select>

          <select
            value={existing?.player_id != null ? String(existing.player_id) : ''}
            disabled={saving === member.user_id}
            onChange={e => save(member, { player_id: e.target.value ? Number(e.target.value) : null })}
            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-xs"
          >
            <option value="">— or link to one player —</option>
            {players.map(p => (
              <option key={p.id} value={String(p.id)}>{p.name}{p.team_id ? ` · ${teamName(p.team_id)}` : ''}</option>
            ))}
          </select>

          <button
            type="button"
            disabled={saving === member.user_id}
            onClick={() => save(member, { ignored: !existing?.ignored })}
            className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              existing?.ignored
                ? 'border-gray-400 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-500'
            }`}
          >
            {existing?.ignored ? 'Marked: no roster kids' : 'No kids on roster'}
          </button>
        </div>

        {s && !s.confident && s.suggestedParents.length > 1 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
            {s.suggestedParents.length} parents share this surname — pick the right one rather than guessing.
          </p>
        )}
      </li>
    );
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">GroupMe members</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
              GroupMe RSVPs arrive as anonymous user ids, so each member has to be linked to a
              family once. After that, tapping &ldquo;I&apos;m in&rdquo; on a GroupMe event records
              an RSVP against their player automatically.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : (
          <>
            {unmapped.length > 0 && (
              <div className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-900/10 p-4 mb-4">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {unmapped.length} member{unmapped.length !== 1 ? 's' : ''} not linked yet
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-1">
                  Their RSVPs are ignored until they&apos;re linked to a family — no attendance is recorded for them.
                </p>
              </div>
            )}

            {unmapped.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Needs linking</h2>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">{unmapped.map(renderRow)}</ul>
              </div>
            )}

            <button
              onClick={() => setShowMapped(v => !v)}
              className="text-sm text-team-blue hover:underline mb-3"
            >
              {showMapped ? 'Hide' : 'Show'} {mapped.length} linked member{mapped.length !== 1 ? 's' : ''}
            </button>

            {showMapped && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">{mapped.map(renderRow)}</ul>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
