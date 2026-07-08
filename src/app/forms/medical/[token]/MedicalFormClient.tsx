'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { submitMedicalForm, MedicalForm } from '@/lib/supabase';

// Field keys we let the parent fill (everything except server-managed columns).
type FieldKey =
  | 'player_name' | 'date_of_birth' | 'gender' | 'address' | 'city' | 'state' | 'zip'
  | 'father_name' | 'father_home_phone' | 'father_work_phone'
  | 'mother_name' | 'mother_home_phone' | 'mother_work_phone'
  | 'emergency1_name' | 'emergency1_home_phone' | 'emergency1_work_phone'
  | 'emergency2_name' | 'emergency2_home_phone' | 'emergency2_work_phone'
  | 'allergies' | 'other_conditions'
  | 'physician_name' | 'physician_home_phone' | 'physician_work_phone'
  | 'insurance_company' | 'insurance_phone' | 'policy_holder' | 'policy_number' | 'group_number'
  | 'signature' | 'signed_date';

const CONSENT_TEXT = `Recognizing the possibility of injury or illness, and in consideration for US Youth Soccer and members of US Youth Soccer accepting my son/daughter as a player in the soccer programs and activities of US Youth Soccer and its members (the "Programs"), I consent to my son/daughter participating in the Programs. Further, I hereby release, discharge, and otherwise indemnify US Youth Soccer, its member organizations and sponsors, their employees, associated personnel, and volunteers, including the owner of fields and facilities utilized for the Programs, against any claim by or on behalf of my player son/daughter as a result of my son's/daughter's participation in the Programs and/or being transported to or from the Programs. I hereby authorize the transportation of my son/daughter to or from the Programs.

My player son/daughter has received a physical examination by a licensed medical doctor and has been found physically capable of participating in the sport of soccer. I have provided written notice, which is submitted in conjunction with this release, setting forth any specific issue, condition, or ailment, in addition to what is specified above, that my child has or that may impact my child's participation in the Programs. I give my consent to have an athletic trainer and/or licensed medical doctor or dentist provide my son/daughter with medical assistance and/or treatment and agree to be financially responsible for the reasonable cost of any such assistance and/or treatment.`;

const todayISO = () => new Date().toISOString().split('T')[0];

export default function MedicalFormClient({ form }: { form: MedicalForm }) {
  const [submitted, setSubmitted] = useState(form.status === 'completed');
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState<boolean>(!!form.consent_agreed);
  const [uploading, setUploading] = useState<'front' | 'back' | null>(null);
  const [frontUrl, setFrontUrl] = useState(form.insurance_card_front_url || '');
  const [backUrl, setBackUrl] = useState(form.insurance_card_back_url || '');

  const [f, setF] = useState<Record<FieldKey, string>>({
    player_name: form.player_name || form.players?.name || '',
    date_of_birth: form.date_of_birth || '',
    gender: form.gender || '',
    address: form.address || '',
    city: form.city || '',
    state: form.state || '',
    zip: form.zip || '',
    father_name: form.father_name || '',
    father_home_phone: form.father_home_phone || '',
    father_work_phone: form.father_work_phone || '',
    mother_name: form.mother_name || '',
    mother_home_phone: form.mother_home_phone || '',
    mother_work_phone: form.mother_work_phone || '',
    emergency1_name: form.emergency1_name || '',
    emergency1_home_phone: form.emergency1_home_phone || '',
    emergency1_work_phone: form.emergency1_work_phone || '',
    emergency2_name: form.emergency2_name || '',
    emergency2_home_phone: form.emergency2_home_phone || '',
    emergency2_work_phone: form.emergency2_work_phone || '',
    allergies: form.allergies || '',
    other_conditions: form.other_conditions || '',
    physician_name: form.physician_name || '',
    physician_home_phone: form.physician_home_phone || '',
    physician_work_phone: form.physician_work_phone || '',
    insurance_company: form.insurance_company || '',
    insurance_phone: form.insurance_phone || '',
    policy_holder: form.policy_holder || '',
    policy_number: form.policy_number || '',
    group_number: form.group_number || '',
    signature: form.signature || '',
    signed_date: form.signed_date || todayISO(),
  });

  const set = (key: FieldKey, val: string) => setF(prev => ({ ...prev, [key]: val }));

  const uploadCard = async (side: 'front' | 'back', file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    setUploading(side);
    try {
      const res = await fetch('/api/presigned-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, folder: 'medical-forms' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const up = await fetch(data.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'Content-Disposition': 'inline', 'Cache-Control': 'max-age=31536000' },
        body: file,
      });
      if (!up.ok) throw new Error('Upload failed');
      if (side === 'front') setFrontUrl(data.publicUrl); else setBackUrl(data.publicUrl);
      toast.success(`Insurance card (${side}) uploaded`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.player_name.trim()) { toast.error("Please enter the player's name"); return; }
    if (!consent) { toast.error('Please check the consent box to continue'); return; }
    if (!f.signature.trim()) { toast.error('Please type your name as your signature'); return; }

    setSaving(true);
    try {
      const { error } = await submitMedicalForm(form.token, {
        ...f,
        date_of_birth: f.date_of_birth || undefined,
        signed_date: f.signed_date || todayISO(),
        consent_agreed: consent,
        insurance_card_front_url: frontUrl || undefined,
        insurance_card_back_url: backUrl || undefined,
      } as Partial<MedicalForm>);
      if (error) throw new Error(error.message);
      setSubmitted(true);
      toast.success('Medical release submitted — thank you!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.message || 'Could not submit the form');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">All set — thank you!</h1>
        <p className="text-gray-600">
          The medical release for <strong>{f.player_name || 'your player'}</strong> has been submitted to Ponca City United FC.
          You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-team-blue">Parent/Guardian Consent &amp; Medical Release</h1>
        <p className="text-gray-600 mt-2">Please complete and sign this form for your player. Fields marked * are required.</p>
      </div>

      {/* Player */}
      <Section title="Player Information">
        <Grid>
          <Field label="Player's Name *" value={f.player_name} onChange={v => set('player_name', v)} required className="sm:col-span-2" />
          <Field label="Date of Birth" type="date" value={f.date_of_birth} onChange={v => set('date_of_birth', v)} />
          <Field label="Gender" value={f.gender} onChange={v => set('gender', v)} />
          <Field label="Address" value={f.address} onChange={v => set('address', v)} className="sm:col-span-2" />
          <Field label="City" value={f.city} onChange={v => set('city', v)} />
          <Field label="State" value={f.state} onChange={v => set('state', v)} />
          <Field label="Zip" value={f.zip} onChange={v => set('zip', v)} />
        </Grid>
      </Section>

      {/* Parents */}
      <Section title="Parent / Guardian">
        <Grid>
          <Field label="Father's Name" value={f.father_name} onChange={v => set('father_name', v)} />
          <Field label="Home Phone" value={f.father_home_phone} onChange={v => set('father_home_phone', v)} />
          <Field label="Work Phone" value={f.father_work_phone} onChange={v => set('father_work_phone', v)} />
          <Field label="Mother's Name" value={f.mother_name} onChange={v => set('mother_name', v)} />
          <Field label="Home Phone" value={f.mother_home_phone} onChange={v => set('mother_home_phone', v)} />
          <Field label="Work Phone" value={f.mother_work_phone} onChange={v => set('mother_work_phone', v)} />
        </Grid>
      </Section>

      {/* Emergency */}
      <Section title="Emergency Contacts" subtitle="If parents cannot be reached">
        <Grid>
          <Field label="Contact 1 Name" value={f.emergency1_name} onChange={v => set('emergency1_name', v)} />
          <Field label="Home Phone" value={f.emergency1_home_phone} onChange={v => set('emergency1_home_phone', v)} />
          <Field label="Work Phone" value={f.emergency1_work_phone} onChange={v => set('emergency1_work_phone', v)} />
          <Field label="Contact 2 Name" value={f.emergency2_name} onChange={v => set('emergency2_name', v)} />
          <Field label="Home Phone" value={f.emergency2_home_phone} onChange={v => set('emergency2_home_phone', v)} />
          <Field label="Work Phone" value={f.emergency2_work_phone} onChange={v => set('emergency2_work_phone', v)} />
        </Grid>
      </Section>

      {/* Medical */}
      <Section title="Medical Information">
        <Grid>
          <Field label="Allergies" value={f.allergies} onChange={v => set('allergies', v)} className="sm:col-span-3" />
          <Field label="Other Medical Conditions" value={f.other_conditions} onChange={v => set('other_conditions', v)} className="sm:col-span-3" />
          <Field label="Player's Physician" value={f.physician_name} onChange={v => set('physician_name', v)} />
          <Field label="Home Phone" value={f.physician_home_phone} onChange={v => set('physician_home_phone', v)} />
          <Field label="Work Phone" value={f.physician_work_phone} onChange={v => set('physician_work_phone', v)} />
        </Grid>
      </Section>

      {/* Insurance */}
      <Section title="Insurance">
        <Grid>
          <Field label="Insurance Company" value={f.insurance_company} onChange={v => set('insurance_company', v)} className="sm:col-span-2" />
          <Field label="Phone" value={f.insurance_phone} onChange={v => set('insurance_phone', v)} />
          <Field label="Policy Holder" value={f.policy_holder} onChange={v => set('policy_holder', v)} />
          <Field label="Policy #" value={f.policy_number} onChange={v => set('policy_number', v)} />
          <Field label="Group #" value={f.group_number} onChange={v => set('group_number', v)} />
        </Grid>
        <p className="text-sm text-gray-500 mt-3">Please attach photos of both sides of your health insurance card.</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <CardUpload label="Insurance card — front" url={frontUrl} uploading={uploading === 'front'}
            onFile={file => uploadCard('front', file)} onClear={() => setFrontUrl('')} />
          <CardUpload label="Insurance card — back" url={backUrl} uploading={uploading === 'back'}
            onFile={file => uploadCard('back', file)} onClear={() => setBackUrl('')} />
        </div>
      </Section>

      {/* Consent */}
      <Section title="Consent & Medical Release">
        <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{CONSENT_TEXT}</p>
        <label className="flex items-start gap-3 mt-4 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 text-team-blue rounded border-gray-300 focus:ring-team-blue" />
          <span className="text-sm text-gray-800">
            I have read and agree to the consent and medical release above on behalf of my player. *
          </span>
        </label>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <Field label="Signature of Parent/Guardian * (type your full name)" value={f.signature} onChange={v => set('signature', v)} required />
          <Field label="Date *" type="date" value={f.signed_date} onChange={v => set('signed_date', v)} required />
        </div>
        <p className="text-xs text-gray-400 mt-2">By typing your name, you are providing your digital signature.</p>
      </Section>

      <button type="submit" disabled={saving}
        className="w-full bg-team-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
        {saving ? 'Submitting…' : 'Submit Medical Release'}
      </button>
    </form>
  );
}

/* ── small presentational helpers ── */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-1">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{children}</div>;
}

function Field({
  label, value, onChange, type = 'text', required = false, className = '',
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={e => onChange(e.target.value)}
        onClick={type === 'date' ? (e) => (e.currentTarget as HTMLInputElement).showPicker?.() : undefined}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
      />
    </div>
  );
}

function CardUpload({
  label, url, uploading, onFile, onClear,
}: {
  label: string; url: string; uploading: boolean; onFile: (file: File) => void; onClear: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {url ? (
        <div className="flex items-center gap-3 p-2 border border-gray-300 rounded-md bg-gray-50">
          <img src={url} alt={label} className="w-12 h-12 object-cover rounded" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-team-blue hover:underline flex-1 truncate">View</a>
          <button type="button" onClick={onClear} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
        </div>
      ) : (
        <label className="block w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-team-blue hover:text-team-blue transition-colors cursor-pointer text-center">
          {uploading ? 'Uploading…' : 'Upload photo'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); }} />
        </label>
      )}
    </div>
  );
}
