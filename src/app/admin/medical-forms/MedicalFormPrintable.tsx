import { MedicalForm } from '@/lib/supabase';

// Fixed-width printable rendition of a completed medical release, styled to
// resemble the US Youth Soccer paper form. Rendered off-screen and rasterized
// to JPEG/PDF for tournament uploads. Insurance-card photos are intentionally
// NOT embedded here (cross-origin S3 images would taint the export canvas) —
// they're downloadable separately from the admin table.
export default function MedicalFormPrintable({ form }: { form: MedicalForm }) {
  const line = (label: string, value?: string) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', minWidth: 0 }}>
      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{label}:</span>
      <span style={{ borderBottom: '1px solid #000', flex: 1, minHeight: 16, paddingLeft: 4 }}>{value || ''}</span>
    </div>
  );

  return (
    <div
      style={{
        width: 760,
        padding: 40,
        background: '#fff',
        color: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 12,
        lineHeight: 1.5,
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
        PARENT/GUARDIAN CONSENT AND PLAYER MEDICAL RELEASE FORM
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
        {line("Player's Name", form.player_name)}
        {line('Date of Birth', form.date_of_birth)}
        {line('Gender', form.gender)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {line('Address', form.address)}
        {line('City', form.city)}
        {line('State', form.state)}
        {line('Zip', form.zip)}
      </div>

      <h2 style={{ fontStyle: 'italic', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>EMERGENCY INFORMATION</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
        {line("Father's Name", form.father_name)}
        {line('Home Phone', form.father_home_phone)}
        {line('Work Phone', form.father_work_phone)}
        {line("Mother's Name", form.mother_name)}
        {line('Home Phone', form.mother_home_phone)}
        {line('Work Phone', form.mother_work_phone)}
      </div>
      <p style={{ fontWeight: 700, margin: '6px 0' }}>In an emergency, when parents cannot be reached, please contact:</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {line('Name', form.emergency1_name)}
        {line('Home Phone', form.emergency1_home_phone)}
        {line('Work Phone', form.emergency1_work_phone)}
        {line('Name', form.emergency2_name)}
        {line('Home Phone', form.emergency2_home_phone)}
        {line('Work Phone', form.emergency2_work_phone)}
      </div>

      <div style={{ marginBottom: 8 }}>{line('Allergies', form.allergies)}</div>
      <div style={{ marginBottom: 8 }}>{line('Other Medical Conditions', form.other_conditions)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
        {line("Player's Physician", form.physician_name)}
        {line('Home Phone', form.physician_home_phone)}
        {line('Work Phone', form.physician_work_phone)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 8 }}>
        {line('Insurance Company', form.insurance_company)}
        {line('Phone', form.insurance_phone)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {line('Policy Holder', form.policy_holder)}
        {line('Policy #', form.policy_number)}
        {line('Group #', form.group_number)}
      </div>

      <h2 style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, margin: '10px 0' }}>
        PARENT/GUARDIAN CONSENT AND MEDICAL RELEASE
      </h2>
      <p style={{ margin: '0 0 10px', textAlign: 'justify' }}>
        Recognizing the possibility of injury or illness, and in consideration for US Youth Soccer and members of US
        Youth Soccer accepting my son/daughter as a player in the soccer programs and activities of US Youth Soccer and
        its members (the &quot;Programs&quot;), I consent to my son/daughter participating in the Programs. Further, I hereby
        release, discharge, and otherwise indemnify US Youth Soccer, its member organizations and sponsors, their
        employees, associated personnel, and volunteers, including the owner of fields and facilities utilized for the
        Programs, against any claim by or on behalf of my player son/daughter as a result of my son&apos;s/daughter&apos;s
        participation in the Programs and/or being transported to or from the Programs. I hereby authorize the
        transportation of my son/daughter to or from the Programs.
      </p>
      <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>
        My player son/daughter has received a physical examination by a licensed medical doctor and has been found
        physically capable of participating in the sport of soccer. I give my consent to have an athletic trainer and/or
        licensed medical doctor or dentist provide my son/daughter with medical assistance and/or treatment and agree to
        be financially responsible for the reasonable cost of any such assistance and/or treatment.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 28 }}>
        <div>
          <div style={{ borderBottom: '1px solid #000', minHeight: 20, fontFamily: 'cursive', fontSize: 16 }}>
            {form.signature || ''}
          </div>
          <div style={{ fontSize: 11 }}>Signature of Parent/Guardian</div>
        </div>
        <div>
          <div style={{ borderBottom: '1px solid #000', minHeight: 20 }}>{form.signed_date || ''}</div>
          <div style={{ fontSize: 11 }}>Date</div>
        </div>
      </div>
      {form.consent_agreed && (
        <p style={{ fontSize: 10, color: '#555', marginTop: 12 }}>
          Digitally consented and signed online{form.completed_at ? ` on ${new Date(form.completed_at).toLocaleString()}` : ''}.
        </p>
      )}
    </div>
  );
}
