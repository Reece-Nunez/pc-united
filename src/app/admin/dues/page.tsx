'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import toast from 'react-hot-toast';
import { getDuesBySeason, upsertDues, getRoster, getTeams, Dues, Player, Team } from '@/lib/supabase';
import { getCurrentSeason, getAvailableSeasons } from '@/lib/seasons';
import { createClient } from '@/lib/supabase-browser';

type Row = { owed: number; paid: number };
const money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DuesPage() {
  const [roster, setRoster] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [season, setSeason] = useState(getCurrentSeason().label);
  const [teamFilter, setTeamFilter] = useState('All');
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [bulk, setBulk] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const seasons = useMemo(() => getAvailableSeasons(8), []);

  useEffect(() => {
    (async () => {
      const [rRes, tRes] = await Promise.all([getRoster(), getTeams()]);
      if (!rRes.error && rRes.data) setRoster(rRes.data);
      if (!tRes.error) setTeams(tRes.data || []);
      setLoading(false);
    })();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => { if (data?.user?.email) setUserEmail(data.user.email); });
  }, []);

  useEffect(() => {
    getDuesBySeason(season).then(({ data }) => {
      const map: Record<number, Row> = {};
      (data || []).forEach((d: Dues) => { if (d.player_id) map[d.player_id] = { owed: Number(d.amount_owed) || 0, paid: Number(d.amount_paid) || 0 }; });
      setRows(map);
    });
  }, [season]);

  const activeRoster = useMemo(() =>
    roster.filter(p => (!p.status || p.status === 'active') && (teamFilter === 'All' || String(p.team_id) === teamFilter)),
    [roster, teamFilter]
  );

  const rowFor = (pid: number): Row => rows[pid] || { owed: 0, paid: 0 };

  const totals = useMemo(() => {
    let owed = 0, paid = 0, paidCount = 0, partial = 0, unpaid = 0;
    activeRoster.forEach(p => {
      const r = rowFor(p.id);
      owed += r.owed; paid += r.paid;
      if (r.owed > 0) {
        if (r.paid >= r.owed) paidCount++;
        else if (r.paid > 0) partial++;
        else unpaid++;
      }
    });
    return { owed, paid, outstanding: owed - paid, paidCount, partial, unpaid };
  }, [activeRoster, rows]);

  const save = async (pid: number, override?: Partial<Row>) => {
    setSavingId(pid);
    const r = { ...rowFor(pid), ...override };
    const { error } = await upsertDues({ player_id: pid, season, amount_owed: r.owed, amount_paid: r.paid, created_by: userEmail });
    if (error) toast.error(error.message);
    setSavingId(null);
  };

  const update = (pid: number, field: keyof Row, value: number) =>
    setRows(prev => ({ ...prev, [pid]: { ...rowFor(pid), [field]: value } }));

  const applyBulk = async () => {
    const val = parseFloat(bulk);
    if (isNaN(val)) { toast.error('Enter an amount'); return; }
    const next = { ...rows };
    activeRoster.forEach(p => { next[p.id] = { ...rowFor(p.id), owed: val }; });
    setRows(next);
    await Promise.all(activeRoster.map(p => upsertDues({ player_id: p.id, season, amount_owed: val, amount_paid: rowFor(p.id).paid, created_by: userEmail })));
    toast.success(`Set ${money(val)} owed for ${activeRoster.length} player${activeRoster.length !== 1 ? 's' : ''}`);
    setBulk('');
  };

  const statusOf = (r: Row) => {
    if (r.owed <= 0) return null;
    if (r.paid >= r.owed) return { label: 'Paid', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    if (r.paid > 0) return { label: 'Partial', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { label: 'Unpaid', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  };

  const exportCSV = () => {
    const headers = ['Player', 'Team', 'Season', 'Owed', 'Paid', 'Balance', 'Status'];
    const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const lines = activeRoster.map(p => {
      const r = rowFor(p.id);
      return [esc(p.name), esc(p.teams?.name || ''), esc(season), r.owed.toFixed(2), r.paid.toFixed(2), (r.owed - r.paid).toFixed(2), statusOf(r)?.label || '—'].join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dues-${season.toLowerCase().replace(/\s+/g, '-')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const numInput = (pid: number, field: keyof Row) => (
    <div className="relative">
      <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
      <input type="number" min="0" step="0.01" value={rowFor(pid)[field] || 0}
        onChange={e => update(pid, field, parseFloat(e.target.value) || 0)}
        onBlur={() => save(pid)}
        className="w-24 pl-5 pr-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm text-right" />
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dues</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track player fees owed and collected</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={season} onChange={e => setSeason(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {seasons.map(s => <option key={s.key} value={s.label}>{s.label}</option>)}
            </select>
            <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="All">All Teams</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={exportCSV} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">CSV</button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Owed</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{money(totals.owed)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Collected</p>
            <p className="text-xl font-bold text-green-600">{money(totals.paid)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Outstanding</p>
            <p className="text-xl font-bold text-red-600">{money(totals.outstanding)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Paid / Partial / Unpaid</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totals.paidCount} / {totals.partial} / {totals.unpaid}</p>
          </div>
        </div>

        {/* Bulk set */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">Set amount owed for all {teamFilter !== 'All' ? teams.find(t => String(t.id) === teamFilter)?.name : 'shown'} players:</span>
          <input type="number" min="0" step="0.01" value={bulk} onChange={e => setBulk(e.target.value)} placeholder="50.00"
            className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm" />
          <button onClick={applyBulk} className="bg-team-blue text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Apply</button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : activeRoster.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No players for this team.</div>
          ) : (
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-right">Owed</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeRoster.map(p => {
                  const r = rowFor(p.id);
                  const st = statusOf(r);
                  const bal = r.owed - r.paid;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                        {savingId === p.id && <span className="ml-2 text-xs text-gray-400">saving…</span>}
                        <span className="block text-xs text-gray-400">{p.teams?.name || ''}</span>
                      </td>
                      <td className="px-4 py-2 text-right">{numInput(p.id, 'owed')}</td>
                      <td className="px-4 py-2 text-right">{numInput(p.id, 'paid')}</td>
                      <td className={`px-4 py-2 text-right text-sm font-semibold ${bal > 0 ? 'text-red-600' : 'text-gray-500'}`}>{money(bal)}</td>
                      <td className="px-4 py-2">{st && <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
