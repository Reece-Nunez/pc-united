import { resend } from './resend';
import { render } from '@react-email/render';
import { createClient } from '@supabase/supabase-js';
import RegistrationEmail from '@/emails/RegistrationEmail';
import ContactEmail from '@/emails/ContactEmail';
import RegistrationConfirmationEmail from '@/emails/RegistrationConfirmationEmail';
import SponsorshipEmail from '@/emails/SponsorshipEmail';
import { Registration } from './supabase';

async function getAdminEmails(): Promise<string[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return [];

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await admin.auth.admin.listUsers();
    if (!data?.users) return [];

    return data.users
      .filter((u) => {
        const role = u.user_metadata?.role;
        const emailNotifs = u.user_metadata?.email_notifications;
        return (role === 'admin' || role === 'approved') && u.email && emailNotifs !== false;
      })
      .map((u) => u.email!);
  } catch {
    return [];
  }
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  playerBirthYear?: string;
  subject?: string;
  message: string;
}

export async function sendRegistrationNotification(registration: Registration, ageGroup: string) {
  try {
    console.log('Starting email notification process...');
    const playerName = `${registration.player_first_name} ${registration.player_last_name}`;
    const parentName = `${registration.parent_first_name} ${registration.parent_last_name}`;
    const submittedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    console.log('Rendering admin email...');
    // Email to coaches - use React Email template
    const adminEmailHtml = await render(RegistrationEmail({
      playerName,
      parentName,
      parentEmail: registration.parent_email,
      parentPhone: registration.parent_phone,
      dateOfBirth: registration.date_of_birth,
      grade: registration.grade || '',
      school: registration.school || '',
      preferredPosition: registration.preferred_position || '',
      previousExperience: registration.previous_experience || '',
      tshirtSize: registration.tshirt_size,
      parentAddress: registration.parent_address,
      parentCity: registration.parent_city,
      parentState: registration.parent_state,
      parentZip: registration.parent_zip,
      emergencyContactName: registration.emergency_contact_name,
      emergencyContactPhone: registration.emergency_contact_phone,
      emergencyContactRelation: registration.emergency_contact_relation,
      medicalConditions: registration.medical_conditions || '',
      allergies: registration.allergies || '',
      medications: registration.medications || '',
      photoPermission: registration.photo_permission || false,
      parentSignature: registration.parent_signature,
      submittedAt
    }));

    console.log('Rendering parent confirmation email...');
    // Email to parent - use React Email template
    const parentEmailHtml = await render(RegistrationConfirmationEmail({
      playerName,
      parentName,
      ageGroup,
      submittedAt
    }));

    console.log('Sending emails via Resend...');
    console.log('Parent email will be sent to:', registration.parent_email);

    // Send email to coaches
    const adminEmails = await getAdminEmails();
    const adminResult = await resend.emails.send({
      from: 'Ponca City United FC <noreply@poncacityunited.com>',
      to: adminEmails,
      replyTo: registration.parent_email,
      subject: `New Registration: ${playerName}`,
      html: adminEmailHtml,
    });

    // Send confirmation email to parent
    const parentResult = await resend.emails.send({
      from: 'Ponca City United FC <noreply@poncacityunited.com>',
      to: registration.parent_email,
      subject: `Registration Confirmation - ${playerName} - Ponca City United FC`,
      html: parentEmailHtml,
    });

    console.log('Email sending results:', {
      adminSuccess: !adminResult.error,
      parentSuccess: !parentResult.error,
      adminEmailId: adminResult.data?.id,
      parentEmailId: parentResult.data?.id
    });

    if (adminResult.error || parentResult.error) {
      console.error('Error sending registration emails:', {
        adminError: adminResult.error,
        parentError: parentResult.error
      });
      return { success: false, error: adminResult.error || parentResult.error };
    }

    return {
      success: true,
      data: {
        adminEmail: adminResult.data,
        parentEmail: parentResult.data
      }
    };
  } catch (error) {
    console.error('Error sending registration emails:', error);
    return { success: false, error };
  }
}

export async function sendContactFormNotification(formData: ContactFormData) {
  try {
    const emailHtml = await render(ContactEmail({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      playerBirthYear: formData.playerBirthYear,
      subject: formData.subject,
      message: formData.message,
      submittedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
      })
    }));

    const subjectLine = formData.subject
      ? `Contact Form: ${formData.subject} - ${formData.name}`
      : `Contact Form Message from ${formData.name}`;

    const adminEmails = await getAdminEmails();
    const { data, error } = await resend.emails.send({
      from: 'Ponca City United FC <noreply@poncacityunited.com>',
      to: adminEmails,
      replyTo: formData.email,
      subject: subjectLine,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending contact form email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending contact form email:', error);
    return { success: false, error };
  }
}

export interface SponsorshipFormData {
  business_name: string;
  contact_person: string;
  phone: string;
  email: string;
  sponsorship_level: string;
  logo_placement?: string;
  amount: number;
  payment_method: string;
  logo_url?: string;
  signature: string;
  signature_date: string;
}

export async function sendSponsorshipNotification(formData: SponsorshipFormData) {
  try {
    const submittedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const emailHtml = await render(
      SponsorshipEmail({
        businessName: formData.business_name,
        contactPerson: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        sponsorshipLevel: formData.sponsorship_level,
        amount: formData.amount,
        logoPlacement: formData.logo_placement,
        paymentMethod: formData.payment_method,
        logoUrl: formData.logo_url,
        signature: formData.signature,
        signatureDate: new Date(formData.signature_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        submittedAt,
      })
    );

    const levelLabels: Record<string, string> = {
      platinum: 'Platinum',
      gold: 'Gold',
      silver: 'Silver',
      bronze: 'Bronze',
    };

    const adminEmails = await getAdminEmails();
    const { data, error } = await resend.emails.send({
      from: 'Ponca City United FC <noreply@poncacityunited.com>',
      to: adminEmails,
      replyTo: formData.email,
      subject: `New Sponsorship: ${formData.business_name} — ${levelLabels[formData.sponsorship_level] || formData.sponsorship_level} ($${formData.amount.toLocaleString()})`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending sponsorship email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending sponsorship email:', error);
    return { success: false, error };
  }
}