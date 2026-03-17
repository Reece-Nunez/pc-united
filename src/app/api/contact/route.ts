import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormNotification, ContactFormData } from '@/lib/email';
import { createAdminNotification } from '@/lib/supabase';
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
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    const contactData: ContactFormData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      playerBirthYear: body.playerBirthYear,
      subject: body.subject,
      message: body.message,
    };

    // Send email notification
    const result = await sendContactFormNotification(contactData);

    if (!result.success) {
      console.error('Failed to send contact email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
    }

    await createAdminNotification({
      type: 'contact',
      title: `New Contact: ${body.name}`,
      message: body.subject ? `${body.subject} — ${body.message.slice(0, 100)}` : body.message.slice(0, 150),
    });

    return NextResponse.json(
      { message: 'Message sent successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}