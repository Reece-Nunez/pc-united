'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import toast from 'react-hot-toast';
import {
  getSchedule, getRoster, getTeams, getGameStats, upsertGameStat,
  Schedule, Player, Team, GameStat,
} from '@/lib/supabase';

type Row = { goals: number; assists: number; yellow_cards: number; red_cards: number; saves: number; clean_sheet: boolean };
const emptyRow: Row = { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, saves: 0, clean_sheet: false };

const isKeeper = (pos?: string) => !!pos && /keep/i.test(pos);

export default function GameStatsPage() {
  const [games, setGames] = useState<Schedule[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [scheduleId, setScheduleId] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [gRes, rRes, tRes] = await Promise.all([getSchedule(), getRoster(), getTeams()]);
      if (!gRes.error && gRes.data) setGames([...(gRes.data as Schedule[])].reverse()); // recent first
      if (!rRes.error && rRes.data) setRoster(rRes.data);
      if (!tRes.error) setTeams(tRes.data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!scheduleId) { setRows({}); return; }
    // Auto-select the team this game is for, so the roster filters to it.
    const g = games.find(x => String(x.id) === scheduleId);
    if (g?.team_id) setTeamFilter(String(g.team_id));
    getGameStats(parseInt(scheduleId)).then(({ data }) => {
      const map: Record<number, Row> = {};
      (data || []).forEach((s: GameStat) => {
        if (s.player_id) map[s.player_id] = {
          goals: s.goals || 0, assists: s.assists || 0, yellow_cards: s.yellow_cards || 0,
          red_cards: s.red_cards || 0, saves: s.saves || 0, clean_sheet: !!s.clean_sheet,
        };
      });
      setRows(map);
    });
  }, [scheduleId, games]);

  const activeRoster = useMemo(() =>
    roster.filter(p => (!p.status || p.status === 'active') && (teamFilter === 'All' || String(p.team_id) === teamFilter)),
    [roster, teamFilter]
  );

  const rowFor = (pid: number): Row => rows[pid] || emptyRow;

  const update = (pid: number, field: keyof Row, value: number | boolean) => {
    setRows(prev => ({ ...prev, [pid]: { ...(prev[pid] || emptyRow), [field]: value } }));
  };

  const save = async (pid: number, override?: Partial<Row>) => {
    if (!scheduleId) return;
    setSavingId(pid);
    const r = { ...rowFor(pid), ...override };
    const { error } = await upsertGameStat({ schedule_id: parseInt(scheduleId), player_id: pid, ...r });
    if (error) toast.error(error.message);
    setSavingId(null);
  };

  const gameLabel = (g: Schedule) =>
    `${new Date(g.game_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${g.home_game ? 'vs' : '@'} ${g.opponent}`;

  const numInput = (pid: number, field: keyof Row) => (
    <input
      type="number" min="0"
      value={(rowFor(pid)[field] as number) || 0}
      onChange={e => update(pid, field, parseInt(e.target.value) || 0)}
      onBlur={() => save(pid)}
      className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm text-center"
    />
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Game Stats</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Record per-player stats for each game</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-5 mb-6 flex flex-col md:flex-row gap-3 md:items-center">
          <select value={scheduleId} onChange={e => setScheduleId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">Select a game…</option>
            {games.map(g => <option key={g.id} value={g.id}>{gameLabel(g)}</option>)}
          </select>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="All">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {!scheduleId ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            Pick a game above to enter stats.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : activeRoster.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No players for this team.</div>
            ) : (
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Player</th>
                    <th className="px-3 py-3 text-center">Goals</th>
                    <th className="px-3 py-3 text-center">Assists</th>
                    <th className="px-3 py-3 text-center">Yellow</th>
                    <th className="px-3 py-3 text-center">Red</th>
                    <th className="px-3 py-3 text-center">Saves</th>
                    <th className="px-3 py-3 text-center">Clean sheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeRoster.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                        {savingId === p.id && <span className="ml-2 text-xs text-gray-400">saving…</span>}
                        <span className="block text-xs text-gray-400">{p.teams?.name || ''}</span>
                      </td>
                      <td className="px-3 py-2 text-center">{numInput(p.id, 'goals')}</td>
                      <td className="px-3 py-2 text-center">{numInput(p.id, 'assists')}</td>
                      <td className="px-3 py-2 text-center">{numInput(p.id, 'yellow_cards')}</td>
                      <td className="px-3 py-2 text-center">{numInput(p.id, 'red_cards')}</td>
                      <td className="px-3 py-2 text-center">{isKeeper(p.position) ? numInput(p.id, 'saves') : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-center">
                        {isKeeper(p.position) ? (
                          <input type="checkbox" checked={rowFor(p.id).clean_sheet}
                            onChange={e => { update(p.id, 'clean_sheet', e.target.checked); save(p.id, { clean_sheet: e.target.checked }); }}
                            className="h-4 w-4 rounded border-gray-300 text-team-blue focus:ring-team-blue" />
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
