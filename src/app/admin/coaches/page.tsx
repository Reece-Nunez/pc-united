'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import {
  getCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
  Coach,
} from '@/lib/supabase';
import { logActivity } from '@/lib/audit';
import { createClient } from '@/lib/supabase-browser';
import ImageUpload from '@/components/ImageUpload';

const TITLE_OPTIONS = ['Head Coach', 'Assistant Coach', 'Goalkeeper Coach', 'Fitness Coach', 'Volunteer'];
const ROLE_OPTIONS = ['head_coach', 'assistant_coach', 'goalkeeper_coach', 'fitness_coach', 'volunteer'];
const LICENSE_OPTIONS = [
  'None',
  'US Soccer Grassroots',
  'USSF E License',
  'USSF D License',
  'USSF C License',
  'USSF B License',
  'USSF A License',
  'USSF Pro License',
];

interface CoachForm {
  name: string;
  title: string;
  photo_url: string;
  email: string;
  phone: string;
  bio: string;
  experience: string;
  philosophy: string;
  background_check: boolean;
  first_aid_certified: boolean;
  concussion_trained: boolean;
  safesport_certified: boolean;
  license_level: string;
  years_coaching: number;
  age_groups: string;
  certifications: string;
  specialties: string;
  user_email: string;
  sort_order: number;
  active: boolean;
  role: string;
}

const emptyForm: CoachForm = {
  name: '',
  title: 'Assistant Coach',
  photo_url: '',
  email: '',
  phone: '',
  bio: '',
  experience: '',
  philosophy: '',
  background_check: false,
  first_aid_certified: false,
  concussion_trained: false,
  safesport_certified: false,
  license_level: 'None',
  years_coaching: 0,
  age_groups: '',
  certifications: '',
  specialties: '',
  user_email: '',
  sort_order: 0,
  active: true,
  role: 'assistant_coach',
};

function coachToForm(coach: Coach): CoachForm {
  return {
    name: coach.name || '',
    title: coach.title || 'Assistant Coach',
    photo_url: coach.photo_url || '',
    email: coach.email || '',
    phone: coach.phone || '',
    bio: coach.bio || '',
    experience: coach.experience || '',
    philosophy: coach.philosophy || '',
    background_check: coach.background_check,
    first_aid_certified: coach.first_aid_certified,
    concussion_trained: coach.concussion_trained,
    safesport_certified: coach.safesport_certified,
    license_level: coach.license_level || 'None',
    years_coaching: coach.years_coaching || 0,
    age_groups: coach.age_groups || '',
    certifications: (coach.certifications || []).join(', '),
    specialties: (coach.specialties || []).join(', '),
    user_email: coach.user_email || '',
    sort_order: coach.sort_order,
    active: coach.active,
    role: coach.role || 'assistant_coach',
  };
}

function formToCoachData(form: CoachForm) {
  return {
    name: form.name,
    title: form.title,
    photo_url: form.photo_url || undefined,
    email: form.email || undefined,
    phone: form.phone || undefined,
    bio: form.bio || undefined,
    experience: form.experience || undefined,
    philosophy: form.philosophy || undefined,
    background_check: form.background_check,
    first_aid_certified: form.first_aid_certified,
    concussion_trained: form.concussion_trained,
    safesport_certified: form.safesport_certified,
    license_level: form.license_level || undefined,
    years_coaching: form.years_coaching,
    age_groups: form.age_groups || undefined,
    certifications: form.certifications ? form.certifications.split(',').map(s => s.trim()).filter(s => s) : [],
    specialties: form.specialties ? form.specialties.split(',').map(s => s.trim()).filter(s => s) : [],
    user_email: form.user_email || undefined,
    sort_order: form.sort_order,
    active: form.active,
    role: form.role,
  };
}

export default function CoachesAdminPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCoachId, setEditingCoachId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [form, setForm] = useState<CoachForm>({ ...emptyForm });
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchCoaches();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      setUserRole(user?.user_metadata?.role || null);
      setUserEmail(user?.email || '');
    });
  }, []);

  async function fetchCoaches() {
    try {
      setLoading(true);
      const { data, error } = await getCoaches();
      if (error) {
        setError(error.message);
      } else if (data) {
        setCoaches(data);
      }
    } catch {
      setError('Failed to fetch coaches');
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = userRole === 'admin';

  const canEditCoach = (coach: Coach) => {
    if (isAdmin) return true;
    if (userEmail && coach.user_email && userEmail === coach.user_email) return true;
    if (userRole === 'approved' && userEmail && coach.user_email && userEmail === coach.user_email) return true;
    return false;
  };

  const canDelete = isAdmin;
  const canAdd = isAdmin;

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (coach.title && coach.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && coach.active) ||
      (statusFilter === 'Inactive' && !coach.active);
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (coach: Coach) => {
    setEditingCoachId(coach.id);
    setForm(coachToForm(coach));
    setShowAddForm(false);
  };

  const handleCancelEdit = () => {
    setEditingCoachId(null);
    setForm({ ...emptyForm });
  };

  const handleChange = (field: keyof CoachForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editingCoachId) return;
    if (!form.name.trim()) {
      toast.error('Coach name is required');
      return;
    }
    try {
      const data = formToCoachData(form);
      const { error } = await updateCoach(editingCoachId, data);
      if (error) throw error;
      await fetchCoaches();
      setEditingCoachId(null);
      setForm({ ...emptyForm });
      toast.success('Coach updated successfully!');
      logActivity('update', 'coach', editingCoachId, userEmail, { name: form.name });
    } catch (err: any) {
      toast.error('Error updating coach: ' + err.message);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error('Coach name is required');
      return;
    }
    try {
      const data = formToCoachData(form);
      const { error } = await createCoach(data as any);
      if (error) throw error;
      await fetchCoaches();
      setForm({ ...emptyForm });
      setShowAddForm(false);
      toast.success('Coach added successfully!');
      logActivity('create', 'coach', form.name, userEmail, { name: form.name, title: form.title });
    } catch (err: any) {
      toast.error('Error adding coach: ' + err.message);
    }
  };

  const handleDeleteCoach = async (coach: Coach) => {
    if (!confirm(`Are you sure you want to delete ${coach.name}? This cannot be undone.`)) return;
    try {
      const { error } = await deleteCoach(coach.id);
      if (error) throw error;
      await fetchCoaches();
      if (editingCoachId === coach.id) {
        setEditingCoachId(null);
        setForm({ ...emptyForm });
      }
      toast.success('Coach deleted successfully!');
      logActivity('delete', 'coach', coach.id, userEmail, { name: coach.name });
    } catch (err: any) {
      toast.error('Error deleting coach: ' + err.message);
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-600 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Coaches</h2>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchCoaches}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const renderForm = (isNew: boolean) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        {isNew ? 'Add New Coach' : 'Edit Coach'}
      </h2>

      {/* Basic Info */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Basic Information
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <select
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              >
                {TITLE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo</label>
            <ImageUpload
              currentImageUrl={form.photo_url}
              onImageChange={(url) => handleChange('photo_url', url)}
              placeholder="Upload a coach photo"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-1 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience</label>
            <textarea
              value={form.experience}
              onChange={(e) => handleChange('experience', e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coaching Philosophy</label>
            <textarea
              value={form.philosophy}
              onChange={(e) => handleChange('philosophy', e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
            />
          </div>
        </div>
      </div>

      {/* Certifications & Training */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Certifications & Training
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.background_check}
                  onChange={(e) => handleChange('background_check', e.target.checked)}
                  className="w-4 h-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Background Check Completed</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.first_aid_certified}
                  onChange={(e) => handleChange('first_aid_certified', e.target.checked)}
                  className="w-4 h-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">First Aid Certified</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.concussion_trained}
                  onChange={(e) => handleChange('concussion_trained', e.target.checked)}
                  className="w-4 h-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Concussion Training Completed</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.safesport_certified}
                  onChange={(e) => handleChange('safesport_certified', e.target.checked)}
                  className="w-4 h-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SafeSport Certified</span>
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Level</label>
              <select
                value={form.license_level}
                onChange={(e) => handleChange('license_level', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              >
                {LICENSE_OPTIONS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Years Coaching</label>
              <input
                type="number"
                min={0}
                value={form.years_coaching}
                onChange={(e) => handleChange('years_coaching', parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age Groups</label>
              <input
                type="text"
                value={form.age_groups}
                onChange={(e) => handleChange('age_groups', e.target.value)}
                placeholder="e.g., U8, U10, U12"
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Skills & Specialties */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Skills & Specialties
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications</label>
            <input
              type="text"
              value={form.certifications}
              onChange={(e) => handleChange('certifications', e.target.value)}
              placeholder="Comma-separated, e.g., CPR, AED, First Responder"
              className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate multiple certifications with commas</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialties</label>
            <input
              type="text"
              value={form.specialties}
              onChange={(e) => handleChange('specialties', e.target.value)}
              placeholder="Comma-separated, e.g., Attacking, Set Pieces, Youth Development"
              className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate multiple specialties with commas</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Settings
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Linked User Email</label>
              <input
                type="email"
                value={form.user_email}
                onChange={(e) => handleChange('user_email', e.target.value)}
                placeholder="Links this coach to a login account"
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
                disabled={!isAdmin}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The email address used to log in to the system</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center space-x-3 cursor-pointer mt-6">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => handleChange('active', e.target.checked)}
                className="w-4 h-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={isNew ? handleAdd : handleSave}
          className="bg-team-blue hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {isNew ? 'Add Coach' : 'Save Changes'}
        </button>
        <button
          onClick={() => {
            if (isNew) {
              setShowAddForm(false);
              setForm({ ...emptyForm });
            } else {
              handleCancelEdit();
            }
          }}
          className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Coaches</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your coaching staff</p>
          </div>
          {canAdd && (
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm) {
                  setEditingCoachId(null);
                  setForm({ ...emptyForm });
                }
              }}
              className="mt-4 md:mt-0 bg-team-blue hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{showAddForm ? 'Cancel' : 'Add Coach'}</span>
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent text-sm font-medium"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="All">All Coaches</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Showing {filteredCoaches.length} of {coaches.length} coaches
          </p>
        </div>

        {/* Add New Coach Form */}
        {showAddForm && renderForm(true)}

        {/* Edit Coach Form */}
        {editingCoachId && !showAddForm && renderForm(false)}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading coaches...</p>
          </div>
        )}

        {/* Coach Cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoaches.map((coach) => (
              <div
                key={coach.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border-2 transition-all hover:shadow-md ${
                  editingCoachId === coach.id
                    ? 'border-team-blue ring-2 ring-team-blue/20'
                    : 'border-transparent'
                }`}
              >
                {/* Photo */}
                <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
                  {coach.photo_url ? (
                    <Image
                      src={coach.photo_url}
                      alt={coach.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/logo.png';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg className="w-20 h-20 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      coach.active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                      {coach.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{coach.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{coach.title}</p>
                  {coach.license_level && coach.license_level !== 'None' && (
                    <p className="text-xs text-team-blue dark:text-blue-400 mt-1">{coach.license_level}</p>
                  )}
                  {coach.years_coaching ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{coach.years_coaching} years coaching</p>
                  ) : null}

                  {/* Certification Badges */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {coach.background_check && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">BG Check</span>
                    )}
                    {coach.first_aid_certified && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">First Aid</span>
                    )}
                    {coach.safesport_certified && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">SafeSport</span>
                    )}
                    {coach.concussion_trained && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Concussion</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {canEditCoach(coach) && (
                      <button
                        onClick={() => handleEdit(coach)}
                        className="flex-1 bg-team-blue hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteCoach(coach)}
                        className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCoaches.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No coaches found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== 'All'
                ? 'Try adjusting your search or filter.'
                : 'Get started by adding your first coach.'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}