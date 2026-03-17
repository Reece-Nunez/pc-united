import { NextRequest, NextResponse } from 'next/server';
import { submitSponsorship, Sponsorship, createAdminNotification } from '@/lib/supabase';
import { sendSponsorshipNotification, SponsorshipFormData } from '@/lib/email';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.turnstileToken || !(await verifyTurnstileToken(body.turnstileToken))) {
      return NextResponse.json(
        { error: 'Bot verification failed. Please try again.' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.business_name || !body.contact_person || !body.phone || !body.email) {
      return NextResponse.json(
        { error: 'Business name, contact person, phone, and email are required.' },
        { status: 400 }
      );
    }
    if (!body.sponsorship_level) {
      return NextResponse.json(
        { error: 'Sponsorship level is required.' },
        { status: 400 }
      );
    }
    if (!body.payment_method) {
      return NextResponse.json(
        { error: 'Payment method is required.' },
        { status: 400 }
      );
    }
    if (!body.signature) {
      return NextResponse.json(
        { error: 'Signature is required.' },
        { status: 400 }
      );
    }

    const sponsorship: Sponsorship = {
      business_name: body.business_name,
      contact_person: body.contact_person,
      phone: body.phone,
      email: body.email,
      sponsorship_level: body.sponsorship_level,
      logo_placement: body.logo_placement || null,
      amount: body.amount,
      payment_method: body.payment_method,
      logo_url: body.logo_url || null,
      signature: body.signature,
      signature_date: body.signature_date,
    };

    // Save to Supabase
    const { error: dbError } = await submitSponsorship(sponsorship);
    if (dbError) {
      console.error('Failed to save sponsorship to database:', dbError);
      // Continue to send email even if DB fails
    }

    // Send email notification to coaches
    const emailData: SponsorshipFormData = {
      business_name: body.business_name,
      contact_person: body.contact_person,
      phone: body.phone,
      email: body.email,
      sponsorship_level: body.sponsorship_level,
      logo_placement: body.logo_placement,
      amount: body.amount,
      payment_method: body.payment_method,
      logo_url: body.logo_url,
      signature: body.signature,
      signature_date: body.signature_date,
    };

    const emailResult = await sendSponsorshipNotification(emailData);
    if (!emailResult.success) {
      console.error('Failed to send sponsorship email:', emailResult.error);
    }

    await createAdminNotification({
      type: 'sponsorship',
      title: `New Sponsorship: ${body.business_name}`,
      message: `${body.contact_person} submitted a ${body.sponsorship_level} sponsorship ($${body.amount?.toLocaleString() || '0'}).`,
      link: '/admin/sponsorships',
    });

    return NextResponse.json(
      { message: 'Sponsorship submitted successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Sponsorship form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
