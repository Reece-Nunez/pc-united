'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import toast from 'react-hot-toast';
import {
  getDuesFeesBySeason, getPaymentsForFees, createFee, updateFee, deleteFee,
  addPayment, deletePayment, getRoster, getTeams,
  DuesFee, DuesPayment, Player, Team,
} from '@/lib/supabase';
import { getCurrentSeason, getAvailableSeasons } from '@/lib/seasons';
import { createClient } from '@/lib/supabase-browser';
import { computePlayerDues, feePaid, duesStatus } from '@/lib/dues';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

const money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Local YYYY-MM-DD (en-CA formats that way) so the date input defaults to the
// admin's own day, not a UTC one that can roll over near midnight.
const todayLocal = () => new Date().toLocaleDateString('en-CA');

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

type PayDraft = { amount: string; method: string; paid_on: string; note: string };
const emptyPay = (): PayDraft => ({ amount: '', method: '', paid_on: todayLocal(), note: '' });

export default function DuesPage() {
  const [roster, setRoster] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [season, setSeason] = useState(getCurrentSeason().label);
  const [teamFilter, setTeamFilter] = useState('All');
  const [fees, setFees] = useState<DuesFee[]>([]);
  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const seasons = useMemo(() => getAvailableSeasons(8), []);

  // Quick-entry: a named fee applied to every shown player.
  const [quickName, setQuickName] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  // Expanded player cards + which fee's "add payment" / which player's
  // "add fee" form is currently open (only one of each at a time).
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [payFor, setPayFor] = useState<number | null>(null);
  const [payDraft, setPayDraft] = useState<PayDraft>(emptyPay());
  const [addFeeFor, setAddFeeFor] = useState<number | null>(null);
  const [feeName, setFeeName] = useState('');
  const [feeAmount, setFeeAmount] = useState('');

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

  const reload = async (s = season) => {
    const { data: feeData } = await getDuesFeesBySeason(s);
    const list = feeData || [];
    setFees(list);
    const { data: payData } = await getPaymentsForFees(list.map(f => f.id));
    setPayments(payData || []);
  };

  useEffect(() => { reload(season); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [season]);

  useRealtimeTable(['dues_fees','dues_payments','players','teams'], () => reload());

  const activeRoster = useMemo(() =>
    roster.filter(p => (!p.status || p.status === 'active') && (teamFilter === 'All' || String(p.team_id) === teamFilter)),
    [roster, teamFilter]
  );

  const feesByPlayer = useMemo(() => {
    const map: Record<number, DuesFee[]> = {};
    fees.forEach(f => { (map[f.player_id] = map[f.player_id] || []).push(f); });
    return map;
  }, [fees]);

  const paymentsOf = (feeId: number) => payments.filter(p => p.fee_id === feeId);
  const feesOf = (pid: number) => feesByPlayer[pid] || [];

  const totals = useMemo(() => {
    let owed = 0, paid = 0, paidCount = 0, partial = 0, unpaid = 0;
    activeRoster.forEach(p => {
      const t = computePlayerDues(feesOf(p.id), payments);
      owed += t.owed; paid += t.paid;
      const st = duesStatus(t.owed, t.paid);
      if (st === 'paid') paidCount++;
      else if (st === 'partial') partial++;
      else if (st === 'unpaid') unpaid++;
    });
    return { owed, paid, outstanding: owed - paid, paidCount, partial, unpaid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoster, fees, payments]);

  const toggle = (pid: number) =>
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(pid)) n.delete(pid); else n.add(pid);
      return n;
    });

  // ── Mutations ────────────────────────────────────────────────────────────
  const applyQuickFee = async () => {
    const name = quickName.trim();
    const amount = parseFloat(quickAmount);
    if (!name) { toast.error('Name the fee (e.g. Club Fee)'); return; }
    if (isNaN(amount) || amount <= 0) { toast.error('Enter an amount'); return; }
    if (activeRoster.length === 0) { toast.error('No players shown'); return; }
    setBusy(true);
    const res = await Promise.all(activeRoster.map(p =>
      createFee({ player_id: p.id, season, name, amount, created_by: userEmail })));
    const failed = res.filter(r => r.error).length;
    await reload();
    setBusy(false);
    setQuickName(''); setQuickAmount('');
    if (failed) toast.error(`${failed} of ${activeRoster.length} failed`);
    else toast.success(`Added ${money(amount)} "${name}" to ${activeRoster.length} player${activeRoster.length !== 1 ? 's' : ''}`);
  };

  const addFeeForPlayer = async (pid: number) => {
    const name = feeName.trim();
    const amount = parseFloat(feeAmount);
    if (!name) { toast.error('Name the fee'); return; }
    if (isNaN(amount) || amount <= 0) { toast.error('Enter an amount'); return; }
    setBusy(true);
    const { error } = await createFee({ player_id: pid, season, name, amount, created_by: userEmail });
    await reload();
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success('Fee added'); setAddFeeFor(null); setFeeName(''); setFeeAmount(''); }
  };

  // Persist an inline edit to a fee's name/amount (called on blur).
  const persistFee = async (fee: DuesFee) => {
    const { error } = await updateFee(fee.id, { name: fee.name, amount: Number(fee.amount) || 0 });
    if (error) toast.error(error.message);
  };
  const editFeeLocal = (id: number, patch: Partial<DuesFee>) =>
    setFees(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  const removeFee = (fee: DuesFee) => confirmToast(
    `Delete "${fee.name}" (${money(Number(fee.amount))})? Its payments will be removed too.`,
    async () => {
      setBusy(true);
      const { error } = await deleteFee(fee.id);
      await reload();
      setBusy(false);
      if (error) toast.error(error.message); else toast.success('Fee deleted');
    });

  const submitPayment = async (feeId: number) => {
    const amount = parseFloat(payDraft.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a payment amount'); return; }
    setBusy(true);
    const { error } = await addPayment({
      fee_id: feeId, amount,
      method: payDraft.method.trim() || undefined,
      paid_on: payDraft.paid_on || todayLocal(),
      note: payDraft.note.trim() || undefined,
      created_by: userEmail,
    });
    await reload();
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`Recorded ${money(amount)}`); setPayFor(null); setPayDraft(emptyPay()); }
  };

  const removePayment = (p: DuesPayment) => confirmToast(
    `Delete payment of ${money(Number(p.amount))}?`,
    async () => {
      setBusy(true);
      const { error } = await deletePayment(p.id);
      await reload();
      setBusy(false);
      if (error) toast.error(error.message); else toast.success('Payment deleted');
    });

  const exportCSV = () => {
    const headers = ['Player', 'Team', 'Season', 'Owed', 'Paid', 'Balance', 'Status'];
    const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const lines = activeRoster.map(p => {
      const t = computePlayerDues(feesOf(p.id), payments);
      const st = duesStatus(t.owed, t.paid);
      return [esc(p.name), esc(p.teams?.name || ''), esc(season), t.owed.toFixed(2), t.paid.toFixed(2), t.balance.toFixed(2), st || '—'].join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dues-${season.toLowerCase().replace(/\s+/g, '-')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dues</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track fees owed and payments collected, itemized per fee</p>
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

        {/* Quick-add a fee to everyone */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Add a fee to all {teamFilter !== 'All' ? teams.find(t => String(t.id) === teamFilter)?.name : 'shown'} players:
            </span>
            <input value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="Fee name (e.g. Club Fee)"
              className="w-44 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm" />
            <div className="relative">
              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
              <input type="number" min="0" step="0.01" value={quickAmount} onChange={e => setQuickAmount(e.target.value)} placeholder="400.00"
                className="w-28 pl-5 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm" />
            </div>
            <button onClick={applyQuickFee} disabled={busy}
              className="bg-team-blue text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Add fee</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Adds a new line item — it won&apos;t overwrite existing fees. Each fee tracks its own payments.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : activeRoster.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No players for this team.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeRoster.map(p => {
                const pFees = feesOf(p.id);
                const t = computePlayerDues(pFees, payments);
                const st = duesStatus(t.owed, t.paid);
                const isOpen = expanded.has(p.id);
                return (
                  <li key={p.id}>
                    {/* Player summary row */}
                    <button onClick={() => toggle(p.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                        <span className="block text-xs text-gray-400">{p.teams?.name || ''} · {pFees.length} fee{pFees.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-sm font-semibold ${t.balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>{money(t.balance)}</span>
                        {st && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[st]}`}>{st[0].toUpperCase() + st.slice(1)}</span>}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>

                    {/* Expanded fee list */}
                    {isOpen && (
                      <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-900/30">
                        {pFees.length === 0 && (
                          <p className="text-xs text-gray-400 py-2">No fees yet.</p>
                        )}
                        {pFees.map(fee => {
                          const paid = feePaid(fee.id, payments);
                          const bal = (Number(fee.amount) || 0) - paid;
                          const feePayments = paymentsOf(fee.id);
                          return (
                            <div key={fee.id} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-3 mt-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <input value={fee.name}
                                  onChange={e => editFeeLocal(fee.id, { name: e.target.value })}
                                  onBlur={() => persistFee(fee)}
                                  className="flex-1 min-w-[8rem] px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm font-medium" />
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                  <input type="number" min="0" step="0.01" value={Number(fee.amount) || 0}
                                    onChange={e => editFeeLocal(fee.id, { amount: parseFloat(e.target.value) || 0 })}
                                    onBlur={() => persistFee(fee)}
                                    className="w-24 pl-5 pr-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm text-right" />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  paid <span className="text-green-600 font-medium">{money(paid)}</span> ·
                                  bal <span className={`font-medium ${bal > 0 ? 'text-red-600' : 'text-gray-500'}`}>{money(bal)}</span>
                                </span>
                                <button onClick={() => { setPayFor(payFor === fee.id ? null : fee.id); setPayDraft(emptyPay()); }}
                                  className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 font-medium">
                                  + Payment
                                </button>
                                <button onClick={() => removeFee(fee)}
                                  className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100">
                                  Delete
                                </button>
                              </div>

                              {/* Payment log */}
                              {feePayments.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {feePayments.map(pay => (
                                    <li key={pay.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pl-1">
                                      <span>
                                        <span className="text-green-600 font-medium">{money(Number(pay.amount))}</span>
                                        {pay.paid_on && <span> · {pay.paid_on}</span>}
                                        {pay.method && <span> · {pay.method}</span>}
                                        {pay.note && <span className="text-gray-400"> · {pay.note}</span>}
                                      </span>
                                      <button onClick={() => removePayment(pay)} className="text-red-500 hover:text-red-700 ml-2">✕</button>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {/* Add-payment form */}
                              {payFor === fee.id && (
                                <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                                  <div>
                                    <label className="block text-[10px] uppercase text-gray-400">Amount</label>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                      <input type="number" min="0" step="0.01" autoFocus value={payDraft.amount}
                                        onChange={e => setPayDraft(d => ({ ...d, amount: e.target.value }))}
                                        className="w-24 pl-5 pr-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm text-right" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase text-gray-400">Date</label>
                                    <input type="date" value={payDraft.paid_on}
                                      onChange={e => setPayDraft(d => ({ ...d, paid_on: e.target.value }))}
                                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase text-gray-400">Method</label>
                                    <input value={payDraft.method} placeholder="Cash, Check, Venmo…"
                                      onChange={e => setPayDraft(d => ({ ...d, method: e.target.value }))}
                                      className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm" />
                                  </div>
                                  <div className="flex-1 min-w-[8rem]">
                                    <label className="block text-[10px] uppercase text-gray-400">Note</label>
                                    <input value={payDraft.note} placeholder="optional"
                                      onChange={e => setPayDraft(d => ({ ...d, note: e.target.value }))}
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm" />
                                  </div>
                                  <button onClick={() => submitPayment(fee.id)} disabled={busy}
                                    className="bg-team-blue text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Save</button>
                                  <button onClick={() => setPayFor(null)}
                                    className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add a fee to just this player */}
                        {addFeeFor === p.id ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input value={feeName} onChange={e => setFeeName(e.target.value)} placeholder="Fee name" autoFocus
                              className="w-40 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm" />
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                              <input type="number" min="0" step="0.01" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder="0.00"
                                className="w-24 pl-5 pr-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm text-right" />
                            </div>
                            <button onClick={() => addFeeForPlayer(p.id)} disabled={busy}
                              className="bg-team-blue text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Add</button>
                            <button onClick={() => { setAddFeeFor(null); setFeeName(''); setFeeAmount(''); }}
                              className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setAddFeeFor(p.id); setFeeName(''); setFeeAmount(''); }}
                            className="mt-2 text-xs text-team-blue hover:underline font-medium">+ Add a fee for {p.name.split(' ')[0]}</button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// Destructive-action confirmation via react-hot-toast (project rule: no
// window.confirm/alert). Shows Delete/Cancel buttons on a persistent toast.
function confirmToast(message: string, onConfirm: () => void) {
  toast((t) => (
    <div className="flex flex-col gap-2">
      <span className="text-sm">{message}</span>
      <div className="flex gap-2 justify-end">
        <button onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600">Cancel</button>
        <button onClick={() => { toast.dismiss(t.id); onConfirm(); }}
          className="px-3 py-1 text-sm rounded bg-red-600 text-white font-medium">Delete</button>
      </div>
    </div>
  ), { duration: Infinity });
}
