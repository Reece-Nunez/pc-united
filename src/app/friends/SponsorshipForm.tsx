'use client';

import { useState, useRef } from 'react';
import { uploadToS3Direct } from '@/lib/s3';

const SPONSORSHIP_LEVELS = [
  {
    id: 'platinum',
    name: 'Platinum',
    amount: 2500,
    description: 'Front of alternate jersey + website feature + social media highlights',
    hasLogoPlacement: true,
  },
  {
    id: 'gold',
    name: 'Gold',
    amount: 1000,
    description: 'Back of alternate jersey or training shirts + website + social shoutouts',
    hasLogoPlacement: true,
  },
  {
    id: 'silver',
    name: 'Silver',
    amount: 500,
    description: 'Website listing + sponsor banner mention + social shoutouts',
    hasLogoPlacement: false,
  },
  {
    id: 'bronze',
    name: 'Bronze / Friends of the Team',
    amount: 250,
    description: 'Business name on website + one social media thank-you',
    hasLogoPlacement: false,
  },
];

const PAYMENT_METHODS = ['Check', 'Cash', 'Venmo', 'Bank Transfer', 'Services/In-Kind', 'Other'];
const LOGO_PLACEMENTS = ['Front', 'Back', 'Sleeve', 'No Preference'];

interface FormData {
  business_name: string;
  contact_person: string;
  phone: string;
  email: string;
  sponsorship_level: string;
  logo_placement: string;
  amount: string;
  payment_method: string;
  signature: string;
}

export default function SponsorshipForm() {
  const [formData, setFormData] = useState<FormData>({
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    sponsorship_level: '',
    logo_placement: '',
    amount: '',
    payment_method: '',
    signature: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const selectedLevel = SPONSORSHIP_LEVELS.find(
    (l) => l.id === formData.sponsorship_level
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLevelChange = (levelId: string) => {
    const level = SPONSORSHIP_LEVELS.find((l) => l.id === levelId);
    setFormData((prev) => ({
      ...prev,
      sponsorship_level: levelId,
      amount: level ? level.amount.toString() : '',
      logo_placement: level?.hasLogoPlacement ? prev.logo_placement : '',
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Logo file must be under 10MB');
        return;
      }
      setLogoFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.business_name || !formData.contact_person || !formData.phone || !formData.email) {
        throw new Error('Please fill in all required business information.');
      }
      if (!formData.sponsorship_level) {
        throw new Error('Please select a sponsorship level.');
      }
      if (!formData.payment_method) {
        throw new Error('Please select a payment method.');
      }
      if (!formData.signature) {
        throw new Error('Please provide your signature.');
      }

      // Upload logo if provided
      let logoUrl = '';
      if (logoFile) {
        const uploadResult = await uploadToS3Direct(
          logoFile,
          'team-images',
          (progress) => setUploadProgress(progress)
        );
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload logo');
        }
        logoUrl = uploadResult.url || '';
      }

      // Submit to API
      const response = await fetch('/api/sponsorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount) || selectedLevel?.amount || 0,
          logo_url: logoUrl,
          signature_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit sponsorship form.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (submitted) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-team-blue mb-4">
              Thank You for Your Sponsorship!
            </h2>
            <p className="text-gray-600 mb-2">
              We've received your sponsorship commitment and our coaching staff will be in touch shortly to finalize the details.
            </p>
            <p className="text-sm text-gray-500">
              A confirmation has been sent to <strong>{formData.email}</strong>.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="sponsorship-form" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">
            Become a Sponsor
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your sponsorship helps lower costs for families, covers tournaments, travel, and gear —
            making competitive soccer affordable and sustainable for our team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Business Information */}
          <div>
            <h3 className="text-xl font-bold text-team-blue mb-4 pb-2 border-b border-gray-200">
              Business Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person *
                </label>
                <input
                  id="contact_person"
                  name="contact_person"
                  type="text"
                  required
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sponsorship Level */}
          <div>
            <h3 className="text-xl font-bold text-team-blue mb-4 pb-2 border-b border-gray-200">
              Sponsorship Level *
            </h3>
            <div className="grid gap-3">
              {SPONSORSHIP_LEVELS.map((level) => (
                <label
                  key={level.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.sponsorship_level === level.id
                      ? 'border-team-red bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sponsorship_level"
                    value={level.id}
                    checked={formData.sponsorship_level === level.id}
                    onChange={() => handleLevelChange(level.id)}
                    className="mt-1 accent-team-red"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-team-blue">{level.name}</span>
                      <span className="font-bold text-team-red text-lg">
                        ${level.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{level.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Logo Placement — only for Platinum & Gold */}
          {selectedLevel?.hasLogoPlacement && (
            <div>
              <h3 className="text-xl font-bold text-team-blue mb-4 pb-2 border-b border-gray-200">
                Preferred Logo Placement
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Choose where you'd like your logo on our alternate jerseys/shirts.
              </p>
              <div className="flex flex-wrap gap-3">
                {LOGO_PLACEMENTS.map((placement) => (
                  <label
                    key={placement}
                    className={`px-5 py-2.5 rounded-full border-2 cursor-pointer transition-all text-sm font-medium ${
                      formData.logo_placement === placement
                        ? 'border-team-red bg-team-red text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="logo_placement"
                      value={placement}
                      checked={formData.logo_placement === placement}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    {placement}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div>
            <h3 className="text-xl font-bold text-team-blue mb-4 pb-2 border-b border-gray-200">
              Payment Information
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              All sponsorship funds are processed through the club's bank account for compliance.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder={selectedLevel ? `${selectedLevel.amount}` : 'Select a level'}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-filled from level. Edit for a custom amount.
                </p>
              </div>
              <div>
                <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  id="payment_method"
                  name="payment_method"
                  required
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                >
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <h3 className="text-xl font-bold text-team-blue mb-4 pb-2 border-b border-gray-200">
              Logo Upload
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload your business logo for website listing and jersey placement (if applicable).
              Accepted formats: PNG, JPG, SVG. Max 10MB.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                logoFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              {logoFile ? (
                <div>
                  <p className="text-green-700 font-medium">{logoFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(logoFile.size / 1024).toFixed(0)} KB — Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 font-medium">Click to upload your logo</p>
                  <p className="text-sm text-gray-400 mt-1">PNG, JPG, or SVG up to 10MB</p>
                </div>
              )}
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-team-red rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* Signature */}
          <div>
            <h3 className="text-xl font-bold text-team-blue mb-4 pb-2 border-b border-gray-200">
              Authorization
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              By signing below, you confirm your commitment to sponsor Ponca City United FC at the selected level.
              Our coaching staff will follow up with payment details and next steps.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-1">
                  Digital Signature *
                </label>
                <input
                  id="signature"
                  name="signature"
                  type="text"
                  required
                  value={formData.signature}
                  onChange={handleChange}
                  placeholder="Type your full name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none italic"
                />
                <p className="text-xs text-gray-500 mt-1">
                  By typing your name, you are providing your digital signature.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={today}
                  disabled
                  className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-team-red hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-lg transition duration-300 cursor-pointer text-lg"
          >
            {submitting ? 'Submitting...' : 'Submit Sponsorship Commitment'}
          </button>
        </form>
      </div>
    </section>
  );
}
