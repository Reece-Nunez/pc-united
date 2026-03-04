'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import DataTable, { Column } from '@/components/admin/DataTable';
import {
  getSponsorships,
  updateSponsorshipStatus,
  submitSponsorship,
  Sponsorship,
  createAdminNotification,
} from '@/lib/supabase';
import { uploadToS3Direct } from '@/lib/s3';
import { logActivity } from '@/lib/audit';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type SponsorshipWithStatus = Sponsorship & { status?: string };

const STATUS_OPTIONS = ['pending', 'contacted', 'approved', 'completed'] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<Status, { bg: string; text: string; ring: string }> = {
  pending:   { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', ring: 'ring-yellow-300 dark:ring-yellow-700' },
  contacted: { bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-800 dark:text-blue-300',     ring: 'ring-blue-300 dark:ring-blue-700' },
  approved:  { bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-800 dark:text-green-300',   ring: 'ring-green-300 dark:ring-green-700' },
  completed: { bg: 'bg-gray-100 dark:bg-gray-700/50',     text: 'text-gray-700 dark:text-gray-300',     ring: 'ring-gray-300 dark:ring-gray-600' },
};

const LEVEL_COLORS: Record<string, string> = {
  gold:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  silver:   'bg-gray-200 text-gray-800 dark:bg-gray-600/40 dark:text-gray-200',
  bronze:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  platinum: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

const SPONSORSHIP_LEVELS = [
  { id: 'platinum', name: 'Platinum', amount: 2500 },
  { id: 'gold', name: 'Gold', amount: 1000 },
  { id: 'silver', name: 'Silver', amount: 500 },
  { id: 'bronze', name: 'Bronze / Friends', amount: 250 },
];

const PAYMENT_METHODS = ['Check', 'Cash', 'Venmo', 'Bank Transfer', 'Other'];
const LOGO_PLACEMENTS = ['Front', 'Back', 'Sleeve', 'No Preference'];

const EMPTY_FORM = {
  business_name: '',
  contact_person: '',
  phone: '',
  email: '',
  sponsorship_level: '',
  logo_placement: '',
  amount: '',
  payment_method: '',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Content() {
  const [sponsorships, setSponsorships] = useState<SponsorshipWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<SponsorshipWithStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLogoFile, setAddLogoFile] = useState<File | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);
  const userEmail = useCurrentUser();

  const fetchSponsorships = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getSponsorships();
      if (error) {
        setError(error.message);
      } else if (data) {
        setSponsorships(data);
      }
    } catch {
      setError('Failed to fetch sponsorships');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSponsorships();
  }, [fetchSponsorships]);

  const handleStatusChange = async (item: SponsorshipWithStatus, newStatus: string) => {
    if (!item.id) return;
    setUpdatingId(String(item.id));
    try {
      const { error } = await updateSponsorshipStatus(item.id, newStatus);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      const businessName = item.business_name || 'Unknown';
      logActivity('update', 'sponsorship', businessName, userEmail, { business: businessName, status: newStatus });
      createAdminNotification({ type: 'sponsorship', title: `Sponsorship Updated: ${businessName}`, message: `${businessName}'s sponsorship status was changed to ${newStatus}.`, link: '/admin/sponsorships' });
      await fetchSponsorships();
    } catch (err: any) {
      toast.error('Failed to update status: ' + (err.message || 'Unknown error'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddLevelChange = (levelId: string) => {
    const level = SPONSORSHIP_LEVELS.find((l) => l.id === levelId);
    setAddForm((prev) => ({
      ...prev,
      sponsorship_level: levelId,
      amount: level ? level.amount.toString() : '',
      logo_placement: levelId === 'platinum' || levelId === 'gold' ? prev.logo_placement : '',
    }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.business_name) {
      toast.error('Please enter the business name.');
      return;
    }
    if (!addForm.sponsorship_level) {
      toast.error('Please select a sponsorship level.');
      return;
    }
    if (!addForm.payment_method) {
      toast.error('Please select a payment method.');
      return;
    }

    setAddSubmitting(true);
    try {
      let logoUrl = '';
      if (addLogoFile) {
        const uploadResult = await uploadToS3Direct(addLogoFile, 'team-images');
        if (!uploadResult.success) throw new Error(uploadResult.error || 'Failed to upload logo');
        logoUrl = uploadResult.url || '';
      }

      const selectedLevel = SPONSORSHIP_LEVELS.find((l) => l.id === addForm.sponsorship_level);
      const sponsorship: Sponsorship = {
        business_name: addForm.business_name,
        contact_person: addForm.contact_person,
        phone: addForm.phone,
        email: addForm.email,
        sponsorship_level: addForm.sponsorship_level,
        logo_placement: addForm.logo_placement || undefined,
        amount: parseFloat(addForm.amount) || selectedLevel?.amount || 0,
        payment_method: addForm.payment_method,
        logo_url: logoUrl || undefined,
        signature: `Added by admin${userEmail ? ` (${userEmail})` : ''}`,
        signature_date: new Date().toISOString(),
      };

      const { error: dbError } = await submitSponsorship(sponsorship);
      if (dbError) throw new Error(dbError.message);

      toast.success(`${addForm.business_name} added as a sponsor!`);
      logActivity('create', 'sponsorship', addForm.business_name, userEmail, {
        business: addForm.business_name,
        level: addForm.sponsorship_level,
        amount: sponsorship.amount,
      });
      createAdminNotification({
        type: 'sponsorship',
        title: `New Sponsor Added: ${addForm.business_name}`,
        message: `${addForm.business_name} was manually added as a ${addForm.sponsorship_level} sponsor ($${sponsorship.amount.toLocaleString()}).`,
        link: '/admin/sponsorships',
      });

      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
      setAddLogoFile(null);
      await fetchSponsorships();
    } catch (err: any) {
      toast.error('Failed to add sponsor: ' + (err.message || 'Unknown error'));
    } finally {
      setAddSubmitting(false);
    }
  };

  // Stats
  const total = sponsorships.length;
  const pending = sponsorships.filter((s) => (s.status || 'pending') === 'pending').length;
  const approved = sponsorships.filter((s) => s.status === 'approved').length;
  const totalRevenue = sponsorships
    .filter((s) => s.status === 'approved' || s.status === 'completed')
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const columns: Column<SponsorshipWithStatus>[] = [
    {
      key: 'business_name',
      label: 'Business Name',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.logo_url ? (
            <img src={item.logo_url} alt="" className="h-8 w-8 object-contain rounded flex-shrink-0" />
          ) : (
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-gray-400 font-bold">{(item.business_name || '?')[0]}</span>
            </div>
          )}
          <span className="font-medium text-gray-900 dark:text-white">{item.business_name}</span>
        </div>
      ),
    },
    {
      key: 'contact_person',
      label: 'Contact',
      sortable: true,
      render: (item) => (
        <div>
          <div className="text-gray-900 dark:text-gray-200">{item.contact_person || <span className="text-gray-400 italic">Not provided</span>}</div>
          {item.email && <div className="text-xs text-gray-500 dark:text-gray-400">{item.email}</div>}
        </div>
      ),
    },
    {
      key: 'sponsorship_level',
      label: 'Level',
      sortable: true,
      render: (item) => {
        const level = (item.sponsorship_level || '').toLowerCase();
        const colorClass = LEVEL_COLORS[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${colorClass}`}>
            {item.sponsorship_level}
          </span>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => {
        const currentStatus = (item.status || 'pending') as Status;
        const colors = STATUS_COLORS[currentStatus] || STATUS_COLORS.pending;
        const isUpdating = updatingId === String(item.id);
        return (
          <select
            value={currentStatus}
            disabled={isUpdating}
            onChange={(e) => handleStatusChange(item, e.target.value)}
            className={`text-xs font-semibold rounded-lg px-2 py-1.5 border-0 ring-1 cursor-pointer outline-none focus:ring-2 transition-colors ${colors.bg} ${colors.text} ${colors.ring} ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(item.created_at)}</span>
      ),
    },
  ];

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Error Loading Sponsorships</h2>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchSponsorships}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Sponsorships</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage sponsorship submissions and track revenue</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-team-blue hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Sponsor
          </button>
        </div>

        {/* Stat Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending</div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">{pending}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-green-200 dark:border-green-800">
            <div className="text-sm font-medium text-green-600 dark:text-green-400">Approved</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{approved}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Revenue</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(totalRevenue)}</div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading sponsorships...</p>
          </div>
        ) : (
          <DataTable<SponsorshipWithStatus>
            data={sponsorships}
            columns={columns}
            keyField="id"
            searchable
            searchPlaceholder="Search by business, contact, or email..."
            onEdit={(item) => setDetailItem(item)}
          />
        )}

        {/* Add Sponsor Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Sponsor</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manually add a new sponsor</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="px-6 py-5 space-y-6">
                {/* Business Information */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Business Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Business Name *</label>
                      <input
                        type="text"
                        required
                        value={addForm.business_name}
                        onChange={(e) => setAddForm((p) => ({ ...p, business_name: e.target.value }))}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-team-blue focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={addForm.contact_person}
                        onChange={(e) => setAddForm((p) => ({ ...p, contact_person: e.target.value }))}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-team-blue focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={addForm.phone}
                        onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-team-blue focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={addForm.email}
                        onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-team-blue focus:outline-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Sponsorship Level */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sponsorship Level *</h3>
                  <div className="grid gap-2">
                    {SPONSORSHIP_LEVELS.map((level) => (
                      <label
                        key={level.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          addForm.sponsorship_level === level.id
                            ? 'border-team-blue bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="add_level"
                          value={level.id}
                          checked={addForm.sponsorship_level === level.id}
                          onChange={() => handleAddLevelChange(level.id)}
                          className="accent-team-blue"
                        />
                        <span className="flex-1 font-medium text-gray-900 dark:text-white">{level.name}</span>
                        <span className="font-bold text-team-blue dark:text-blue-400">${level.amount.toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Logo Placement — only for Platinum & Gold */}
                {(addForm.sponsorship_level === 'platinum' || addForm.sponsorship_level === 'gold') && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Logo Placement</h3>
                    <div className="flex flex-wrap gap-2">
                      {LOGO_PLACEMENTS.map((placement) => (
                        <label
                          key={placement}
                          className={`px-4 py-2 rounded-full border-2 cursor-pointer transition-all text-sm font-medium ${
                            addForm.logo_placement === placement
                              ? 'border-team-blue bg-team-blue text-white'
                              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="add_placement"
                            value={placement}
                            checked={addForm.logo_placement === placement}
                            onChange={(e) => setAddForm((p) => ({ ...p, logo_placement: e.target.value }))}
                            className="sr-only"
                          />
                          {placement}
                        </label>
                      ))}
                    </div>
                  </section>
                )}

                {/* Payment */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Payment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={addForm.amount}
                        onChange={(e) => setAddForm((p) => ({ ...p, amount: e.target.value }))}
                        placeholder={addForm.sponsorship_level ? SPONSORSHIP_LEVELS.find((l) => l.id === addForm.sponsorship_level)?.amount.toString() : 'Select level'}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-team-blue focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-filled from level. Edit for custom amount.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Method *</label>
                      <select
                        required
                        value={addForm.payment_method}
                        onChange={(e) => setAddForm((p) => ({ ...p, payment_method: e.target.value }))}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-team-blue focus:outline-none"
                      >
                        <option value="">Select method</option>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Logo Upload */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Logo (Optional)</h3>
                  <div
                    onClick={() => addFileRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      addLogoFile
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <input
                      ref={addFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > 10 * 1024 * 1024) {
                          toast.error('Logo must be under 10MB');
                          return;
                        }
                        setAddLogoFile(file || null);
                      }}
                      className="hidden"
                    />
                    {addLogoFile ? (
                      <p className="text-green-700 dark:text-green-400 font-medium">{addLogoFile.name} <span className="text-sm text-gray-500">({(addLogoFile.size / 1024).toFixed(0)} KB)</span></p>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Click to upload logo (PNG, JPG, SVG)</p>
                    )}
                  </div>
                </section>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); setAddLogoFile(null); }}
                    className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="px-5 py-2.5 bg-team-blue hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                  >
                    {addSubmitting ? 'Adding...' : 'Add Sponsor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {detailItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDetailItem(null);
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{detailItem.business_name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sponsorship Details</p>
                </div>
                <button
                  onClick={() => setDetailItem(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5 space-y-6">
                {/* Contact Information */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailField label="Contact Person" value={detailItem.contact_person || ''} />
                    <DetailField label="Email" value={detailItem.email || ''} isLink={detailItem.email ? `mailto:${detailItem.email}` : undefined} />
                    <DetailField label="Phone" value={detailItem.phone || ''} isLink={detailItem.phone ? `tel:${detailItem.phone}` : undefined} />
                  </div>
                </section>

                {/* Sponsorship Details */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sponsorship Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailField label="Level" value={detailItem.sponsorship_level} />
                    <DetailField label="Amount" value={formatCurrency(detailItem.amount)} />
                    <DetailField label="Payment Method" value={detailItem.payment_method} />
                    <DetailField label="Logo Placement" value={detailItem.logo_placement || 'Not specified'} />
                    <DetailField label="Status" value={(detailItem.status || 'pending').charAt(0).toUpperCase() + (detailItem.status || 'pending').slice(1)} />
                    <DetailField label="Submitted" value={formatDate(detailItem.created_at)} />
                  </div>
                </section>

                {/* Logo */}
                {detailItem.logo_url && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Logo</h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <img
                          src={detailItem.logo_url}
                          alt={`${detailItem.business_name} logo`}
                          className="h-20 w-auto object-contain rounded"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={detailItem.logo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          View full size
                        </a>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(detailItem.logo_url!);
                              const blob = await res.blob();
                              const ext = detailItem.logo_url!.split('.').pop()?.split('?')[0] || 'png';
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${detailItem.business_name.replace(/\s+/g, '-').toLowerCase()}-logo.${ext}`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch {
                              toast.error('Failed to download logo');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Signature */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Signature</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailField label="Signature" value={detailItem.signature || ''} />
                    <DetailField label="Signature Date" value={formatDate(detailItem.signature_date)} />
                  </div>
                </section>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end rounded-b-2xl">
                <button
                  onClick={() => setDetailItem(null)}
                  className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function DetailField({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
        {isLink ? (
          <a href={isLink} className="text-blue-600 dark:text-blue-400 hover:underline">
            {value}
          </a>
        ) : (
          value || '-'
        )}
      </dd>
    </div>
  );
}

export default function SponsorshipsAdminPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </AdminLayout>
      }
    >
      <Content />
    </Suspense>
  );
}
