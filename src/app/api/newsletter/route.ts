import { NextRequest, NextResponse } from 'next/server';
import { subscribeNewsletter } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const { error } = await subscribeNewsletter(email);

    if (error) {
      // Duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'You\'re already subscribed!' },
          { status: 200 }
        );
      }
      console.error('Newsletter subscribe error:', error);
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Subscribed successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Newsletter API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
