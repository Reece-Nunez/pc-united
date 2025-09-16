import { NextRequest, NextResponse } from 'next/server';
import { sendRegistrationNotification } from '@/lib/email';
import { Registration } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registration, ageGroup } = body;

    console.log('API received:', { registration: !!registration, ageGroup });

    if (!registration || !ageGroup) {
      return NextResponse.json(
        { error: 'Missing registration data or age group' },
        { status: 400 }
      );
    }

    console.log('Calling sendRegistrationNotification...');
    const result = await sendRegistrationNotification(registration as Registration, ageGroup);
    console.log('Email result:', result);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      console.error('Email sending failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in registration email API:', error);
    return NextResponse.json(
      { error: 'Failed to send registration email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}