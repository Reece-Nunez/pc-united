import { resend } from './resend';
import { render } from '@react-email/render';
import RegistrationEmail from '@/emails/RegistrationEmail';
import ContactEmail from '@/emails/ContactEmail';
import RegistrationConfirmationEmail from '@/emails/RegistrationConfirmationEmail';
import { Registration } from './supabase';

const ADMIN_EMAILS = [
  'vramirez@poncacityunited.com',
  'jmckeachnie@poncacityunited.com',
  'rnunez@poncacityunited.com'
];

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
    const adminResult = await resend.emails.send({
      from: 'Ponca City United FC <noreply@poncacityunited.com>',
      to: ADMIN_EMAILS,
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

    const { data, error } = await resend.emails.send({
      from: 'Ponca City United FC <noreply@poncacityunited.com>',
      to: ADMIN_EMAILS,
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