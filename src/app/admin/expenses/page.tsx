'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import toast from 'react-hot-toast';
import { getExpenses, createExpense, updateExpense, deleteExpense, getSponsorships, Expense } from '@/lib/supabase';
import { logActivity } from '@/lib/audit';
import { createClient } from '@/lib/supabase-browser';
import { getCurrentSeason, getAvailableSeasons, getSeasonLabel, isDateInSeason, type Season } from '@/lib/seasons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { SkeletonTable } from '@/components/admin/Skeleton';

const CATEGORIES = [
  'Equipment',
  'Uniforms',
  'Field Rental',
  'Tournament Fees',
  'Travel',
  'Training',
  'Insurance',
  'Referee Fees',
  'Trophies & Awards',
  'Marketing',
  'Website',
  'Supplies',
  'Food & Drinks',
  'Other',
];

const PAYMENT_METHODS = ['Check', 'Cash', 'Venmo', 'Bank Transfer', 'Credit Card', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  'Equipment': '#3b82f6',
  'Uniforms': '#8b5cf6',
  'Field Rental': '#22c55e',
  'Tournament Fees': '#f59e0b',
  'Travel': '#ef4444',
  'Training': '#06b6d4',
  'Insurance': '#64748b',
  'Referee Fees': '#ec4899',
  'Trophies & Awards': '#f97316',
  'Marketing': '#14b8a6',
  'Website': '#6366f1',
  'Supplies': '#84cc16',
  'Food & Drinks': '#a855f7',
  'Other': '#9ca3af',
};

interface ExpenseForm {
  description: string;
  amount: string;
  category: string;
  vendor: string;
  expense_date: string;
  payment_method: string;
  receipt_url: string;
  notes: string;
  season: string;
}

const emptyForm: ExpenseForm = {
  description: '',
  amount: '',
  category: 'Equipment',
  vendor: '',
  expense_date: new Date().toISOString().split('T')[0],
  payment_method: 'Check',
  receipt_url: '',
  notes: '',
  season: getCurrentSeason().label,
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season>(getCurrentSeason());
  const [filterCategory, setFilterCategory] = useState('all');
  const seasons = useMemo(() => getAvailableSeasons(8), []);

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
      const [expensesRes, sponsorshipsRes] = await Promise.all([
        getExpenses(),
        getSponsorships(),
      ]);
      if (!expensesRes.error) setExpenses(expensesRes.data || []);

      // Calculate total revenue from approved/completed sponsorships (excluding Services/In-Kind)
      const sponsorships = sponsorshipsRes.data || [];
      const revenue = sponsorships
        .filter((s: any) => (s.status === 'approved' || s.status === 'completed') && s.payment_method !== 'Services/In-Kind')
        .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
      setTotalRevenue(revenue);
    } catch (error: any) {
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses by selected season
  const filteredExpenses = useMemo(() => {
    let filtered = expenses.filter(e => e.expense_date && isDateInSeason(e.expense_date, selectedSeason));
    if (filterCategory !== 'all') {
      filtered = filtered.filter(e => e.category === filterCategory);
    }
    return filtered;
  }, [expenses, selectedSeason, filterCategory]);

  const totalExpenses = useMemo(() =>
    filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredExpenses]
  );

  const allSeasonExpenses = useMemo(() =>
    expenses.filter(e => e.expense_date && isDateInSeason(e.expense_date, selectedSeason))
      .reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses, selectedSeason]
  );

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses
      .filter(e => e.expense_date && isDateInSeason(e.expense_date, selectedSeason))
      .forEach(e => {
        map[e.category] = (map[e.category] || 0) + Number(e.amount);
      });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, selectedSeason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        vendor: form.vendor || undefined,
        expense_date: form.expense_date,
        payment_method: form.payment_method,
        receipt_url: form.receipt_url || undefined,
        notes: form.notes || undefined,
        season: form.season,
        created_by: userEmail || undefined,
      };

      if (editing) {
        const result = await updateExpense(editing.id, data);
        if (result.error) throw new Error(result.error.message);
        toast.success('Expense updated');
        logActivity('update', 'expense', editing.id, userEmail, { description: form.description });
        setEditing(null);
      } else {
        const result = await createExpense(data);
        if (result.error) throw new Error(result.error.message);
        toast.success('Expense added');
        logActivity('create', 'expense', result.data?.[0]?.id || form.description, userEmail, { description: form.description });
      }

      setForm(emptyForm);
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      vendor: expense.vendor || '',
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      receipt_url: expense.receipt_url || '',
      notes: expense.notes || '',
      season: expense.season || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setLoading(true);
    try {
      const result = await deleteExpense(id);
      if (result.error) throw new Error(result.error.message);
      toast.success('Expense deleted');
      logActivity('delete', 'expense', id, userEmail);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const balance = totalRevenue - allSeasonExpenses;

  const exportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }
    const headers = ['Date', 'Description', 'Category', 'Vendor', 'Amount', 'Payment Method', 'Notes'];
    const escapeField = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const rows = filteredExpenses.map(e => [
      e.expense_date,
      escapeField(e.description),
      escapeField(e.category),
      escapeField(e.vendor || ''),
      Number(e.amount).toFixed(2),
      escapeField(e.payment_method),
      escapeField(e.notes || ''),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const seasonSlug = selectedSeason.label.toLowerCase().replace(/\s+/g, '-');
    a.href = url;
    a.download = `expenses-${seasonSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expenses to print');
      return;
    }
    const fmt = (n: number) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rows = filteredExpenses
      .map(e => `<tr>
        <td style="padding:6px 10px;border:1px solid #ccc;">${new Date(e.expense_date).toLocaleDateString()}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;">${e.description}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;">${e.category}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;">${e.vendor || '-'}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;text-align:right;">${fmt(Number(e.amount))}</td>
        <td style="padding:6px 10px;border:1px solid #ccc;">${e.payment_method}</td>
      </tr>`)
      .join('');
    const html = `<!DOCTYPE html>
<html><head><title>Expense Report - ${selectedSeason.label}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 40px; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  .subtitle { font-size: 14px; color: #444; margin-bottom: 2px; }
  .date { font-size: 12px; color: #666; margin-bottom: 24px; }
  .summary { margin-bottom: 24px; }
  .summary td { padding: 4px 16px 4px 0; font-size: 14px; }
  .summary .label { font-weight: bold; }
  table.expenses { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
  table.expenses th { padding: 8px 10px; border: 1px solid #999; background: #f5f5f5; text-align: left; font-size: 12px; text-transform: uppercase; }
  table.expenses td { font-size: 13px; }
  .total-row td { font-weight: bold; border-top: 2px solid #000; }
  .footer { font-size: 11px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 24px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>Ponca City United FC &mdash; Expense Report</h1>
<p class="subtitle">${selectedSeason.label}</p>
<p class="date">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<table class="summary">
  <tr><td class="label">Total Revenue:</td><td>${fmt(totalRevenue)}</td></tr>
  <tr><td class="label">Total Expenses:</td><td>${fmt(allSeasonExpenses)}</td></tr>
  <tr><td class="label">Balance:</td><td>${balance < 0 ? '-' : ''}${fmt(balance)}</td></tr>
</table>
<table class="expenses">
  <thead><tr>
    <th>Date</th><th>Description</th><th>Category</th><th>Vendor</th><th style="text-align:right;">Amount</th><th>Payment Method</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="total-row">
    <td style="padding:8px 10px;border:1px solid #999;" colspan="4">Total</td>
    <td style="padding:8px 10px;border:1px solid #999;text-align:right;">${fmt(totalExpenses)}</td>
    <td style="padding:8px 10px;border:1px solid #999;"></td>
  </tr></tfoot>
</table>
<div class="footer">Generated from poncacityunited.com</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track where sponsorship money is going</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedSeason.key}
              onChange={(e) => {
                const s = seasons.find(s => s.key === e.target.value);
                if (s) setSelectedSeason(s);
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-team-blue"
            >
              {seasons.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={exportCSV}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={printReport}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Print Report
            </button>
            <button
              onClick={() => { setShowForm(!showForm); if (editing) cancelEdit(); }}
              className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add Expense'}
            </button>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600 mt-1">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-400 mt-1">From approved sponsorships</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{selectedSeason.label} Expenses</p>
            <p className="text-2xl font-bold text-red-600 mt-1">${allSeasonExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-400 mt-1">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} this season</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Balance</p>
            <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance < 0 ? '-' : ''}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">Revenue minus {selectedSeason.label.toLowerCase()} expenses</p>
          </div>
        </div>

        {/* Chart + Form Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Category Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Spending by Category</h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                No expenses this season
              </div>
            )}
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editing ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
                    required
                    placeholder="What was this expense for?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.amount}
                        onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                    <input
                      type="date"
                      value={form.expense_date}
                      onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        expense_date: e.target.value,
                        season: getSeasonLabel(e.target.value),
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                    <select
                      value={form.payment_method}
                      onChange={(e) => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(e) => setForm(prev => ({ ...prev, vendor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
                    placeholder="Who was paid?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
                    placeholder="Additional details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt</label>
                  {form.receipt_url ? (
                    <div className="flex items-center gap-3 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                      {form.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={form.receipt_url} alt="Receipt" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={form.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-team-blue hover:underline truncate block">
                          View Receipt
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setForm(prev => ({ ...prev, receipt_url: '' })); if (receiptInputRef.current) receiptInputRef.current.value = ''; }}
                        className="text-red-500 hover:text-red-700 text-sm shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={receiptInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('File must be under 10MB');
                            return;
                          }
                          setUploadingReceipt(true);
                          try {
                            const res = await fetch('/api/presigned-upload', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, folder: 'receipts' }),
                            });
                            const data = await res.json();
                            if (!data.success) throw new Error(data.error);
                            const upload = await fetch(data.presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type, 'Content-Disposition': 'inline', 'Cache-Control': 'max-age=31536000' }, body: file });
                            if (!upload.ok) throw new Error('Upload failed');
                            setForm(prev => ({ ...prev, receipt_url: data.publicUrl }));
                            toast.success('Receipt uploaded');
                          } catch (err: any) {
                            toast.error(err.message || 'Upload failed');
                          } finally {
                            setUploadingReceipt(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => receiptInputRef.current?.click()}
                        disabled={uploadingReceipt}
                        className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:border-team-blue hover:text-team-blue transition-colors disabled:opacity-50"
                      >
                        {uploadingReceipt ? 'Uploading...' : 'Upload Receipt (Image or PDF)'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-team-blue text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {editing ? 'Update Expense' : 'Add Expense'}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* If form is hidden, show the top expenses summary instead */}
          {!showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Expenses</h2>
              {filteredExpenses.length > 0 ? (
                <div className="space-y-3">
                  {filteredExpenses.slice(0, 6).map(exp => (
                    <div key={exp.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[exp.category] || '#9ca3af' }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{exp.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{exp.category} &middot; {new Date(exp.expense_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-red-600 shrink-0 ml-3">
                        -${Number(exp.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No expenses this season</p>
              )}
            </div>
          )}
        </div>

        {/* Expense List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Expenses ({filteredExpenses.length})
            </h2>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-team-blue"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {loading && expenses.length === 0 ? (
            <SkeletonTable rows={6} />
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No expenses found for {selectedSeason.label}{filterCategory !== 'all' ? ` in ${filterCategory}` : ''}.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-team-blue hover:underline text-sm font-medium"
              >
                Add your first expense
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 md:px-6 py-3">Description</th>
                    <th className="px-4 md:px-6 py-3">Category</th>
                    <th className="px-4 md:px-6 py-3 hidden md:table-cell">Vendor</th>
                    <th className="px-4 md:px-6 py-3">Date</th>
                    <th className="px-4 md:px-6 py-3 hidden md:table-cell">Payment</th>
                    <th className="px-4 md:px-6 py-3 text-right">Amount</th>
                    <th className="px-4 md:px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 md:px-6 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{exp.description}</p>
                          {exp.receipt_url && (
                            <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" title="View receipt" className="text-green-600 hover:text-green-800 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          )}
                        </div>
                        {exp.notes && <p className="text-xs text-gray-400 truncate max-w-[200px] hidden md:block">{exp.notes}</p>}
                      </td>
                      <td className="px-4 md:px-6 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[exp.category] || '#9ca3af' }} />
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        {exp.vendor || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(exp.expense_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        {exp.payment_method}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm font-semibold text-red-600 text-right">
                        ${Number(exp.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(exp)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={3} className="px-4 md:px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right md:hidden">
                      Total:
                    </td>
                    <td colSpan={5} className="px-4 md:px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right hidden md:table-cell">
                      Total:
                    </td>
                    <td className="px-4 md:px-6 py-3 text-sm font-bold text-red-600 text-right">
                      ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
