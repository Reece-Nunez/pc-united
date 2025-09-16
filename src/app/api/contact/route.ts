import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormNotification, ContactFormData } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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