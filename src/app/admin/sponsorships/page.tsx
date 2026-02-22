'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import DataTable, { Column } from '@/components/admin/DataTable';
import {
  getSponsorships,
  updateSponsorshipStatus,
  Sponsorship,
  createAdminNotification,
} from '@/lib/supabase';
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
    const id = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
    setUpdatingId(String(item.id));
    try {
      const { error } = await updateSponsorshipStatus(id, newStatus);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      logActivity('update', 'sponsorship', String(item.id), userEmail, { status: newStatus });
      createAdminNotification({ type: 'sponsorship', title: 'Sponsorship Status Updated', message: 'Sponsorship status changed to ' + newStatus, link: '/admin/sponsorships' });
      await fetchSponsorships();
    } catch (err: any) {
      toast.error('Failed to update status: ' + (err.message || 'Unknown error'));
    } finally {
      setUpdatingId(null);
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
        <span className="font-medium text-gray-900 dark:text-white">{item.business_name}</span>
      ),
    },
    {
      key: 'contact_person',
      label: 'Contact',
      sortable: true,
      render: (item) => (
        <div>
          <div className="text-gray-900 dark:text-gray-200">{item.contact_person}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{item.email}</div>
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
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Sponsorships</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage sponsorship submissions and track revenue</p>
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
                    <DetailField label="Contact Person" value={detailItem.contact_person} />
                    <DetailField label="Email" value={detailItem.email} isLink={`mailto:${detailItem.email}`} />
                    <DetailField label="Phone" value={detailItem.phone} isLink={`tel:${detailItem.phone}`} />
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
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-4">
                      <img
                        src={detailItem.logo_url}
                        alt={`${detailItem.business_name} logo`}
                        className="h-16 w-auto object-contain rounded"
                      />
                      <a
                        href={detailItem.logo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {detailItem.logo_url}
                      </a>
                    </div>
                  </section>
                )}

                {/* Signature */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Signature</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailField label="Signature" value={detailItem.signature} />
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
