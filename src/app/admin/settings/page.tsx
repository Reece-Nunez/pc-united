'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import toast from 'react-hot-toast';
import { getAllSettings, updateSettings } from '@/lib/supabase';
import PlacesAutocomplete from '@/components/admin/PlacesAutocomplete';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const { settings: data } = await getAllSettings();
      setSettings(data);
      setLoading(false);
    }
    loadSettings();
  }, []);

  const update = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateSettings(settings);
      if (error) throw new Error('Failed to save');
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const helpClass = 'text-xs text-gray-500 dark:text-gray-400 mt-1';

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Configure site-wide settings</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-team-blue text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">

            {/* Team Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Information</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Team Name</label>
                  <input
                    type="text"
                    value={settings.team_name || ''}
                    onChange={(e) => update('team_name', e.target.value)}
                    className={inputClass}
                    placeholder="Ponca City United FC"
                  />
                  <p className={helpClass}>Used in email headers, page titles, and branding throughout the site.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Contact Email</label>
                    <input
                      type="email"
                      value={settings.contact_email || ''}
                      onChange={(e) => update('contact_email', e.target.value)}
                      className={inputClass}
                      placeholder="coach@example.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Phone</label>
                    <input
                      type="tel"
                      value={settings.contact_phone || ''}
                      onChange={(e) => update('contact_phone', formatPhone(e.target.value))}
                      className={inputClass}
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Home Field Location</label>
                  <PlacesAutocomplete
                    value={settings.home_field_location || ''}
                    onChange={(val) => update('home_field_location', val)}
                    className={inputClass}
                    placeholder="Search for your home field"
                  />
                  <p className={helpClass}>Auto-fills the location field when scheduling home games.</p>
                </div>
              </div>
            </div>

            {/* Registration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Registration</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Max Roster Size</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.max_roster_size || '25'}
                      onChange={(e) => update('max_roster_size', e.target.value)}
                      className={inputClass}
                    />
                    <p className={helpClass}>Registration auto-closes when this limit is reached.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Registration Status</label>
                    <select
                      value={settings.registration_override || 'auto'}
                      onChange={(e) => update('registration_override', e.target.value)}
                      className={inputClass}
                    >
                      <option value="auto">Auto (close at max roster)</option>
                      <option value="open">Force Open</option>
                      <option value="closed">Force Closed</option>
                    </select>
                    <p className={helpClass}>Override automatic registration open/close behavior.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Email / Newsletter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email &amp; Newsletter</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Newsletter Sender Name</label>
                  <input
                    type="text"
                    value={settings.newsletter_sender_name || ''}
                    onChange={(e) => update('newsletter_sender_name', e.target.value)}
                    className={inputClass}
                    placeholder="Ponca City United FC"
                  />
                  <p className={helpClass}>The &quot;From&quot; name on all outgoing emails (e.g. game notifications, news, announcements).</p>
                </div>
              </div>
            </div>

            {/* Season Dates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Season Dates</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure when each season starts. Each season runs until the next one begins. Format: MM-DD (month-day).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { key: 'season_spring_start', label: 'Spring Start', fallback: '03-08' },
                  { key: 'season_summer_start', label: 'Summer Start', fallback: '05-24' },
                  { key: 'season_fall_start', label: 'Fall Start', fallback: '09-06' },
                  { key: 'season_winter_start', label: 'Winter Start', fallback: '11-16' },
                ].map(({ key, label, fallback }) => {
                  const mmdd = settings[key] || fallback;
                  const currentYear = new Date().getFullYear();
                  const dateValue = `${currentYear}-${mmdd}`;
                  return (
                    <div key={key}>
                      <label className={labelClass}>{label}</label>
                      <input
                        type="date"
                        value={dateValue}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const parts = val.split('-');
                            update(key, `${parts[1]}-${parts[2]}`);
                          }
                        }}
                        className={inputClass}
                      />
                    </div>
                  );
                })}
              </div>
              <p className={helpClass}>
                Select the month and day each season starts. The year is ignored. Changes take effect after saving and refreshing.
              </p>
            </div>

            {/* Save button at bottom too */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-team-blue text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
