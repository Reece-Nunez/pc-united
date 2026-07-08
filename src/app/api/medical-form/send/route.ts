import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

// Normalize a US phone number to E.164 (+1XXXXXXXXXX). Accepts input with
// spaces, dashes, parens, or a leading +/1. Returns null if it can't be made valid.
function toE164(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (raw.trim().startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { to, token, playerName } = await request.json();

    if (!to || !token) {
      return NextResponse.json({ success: false, error: 'Missing phone number or form token.' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
      return NextResponse.json(
        { success: false, error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID).' },
        { status: 500 }
      );
    }

    const toNumber = toE164(to);
    if (!toNumber) {
      return NextResponse.json({ success: false, error: `Invalid phone number: ${to}` }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poncacityunited.com';
    const link = `${baseUrl.replace(/\/$/, '')}/forms/medical/${token}`;
    const who = playerName ? ` for ${playerName}` : '';
    const body = `Ponca City United FC: Please complete & sign the player medical release form${who}: ${link}\n\nReply STOP to opt out.`;

    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      to: toNumber,
      body,
      ...(messagingServiceSid ? { messagingServiceSid } : { from }),
    });

    return NextResponse.json({ success: true, sid: message.sid, to: toNumber });
  } catch (error: any) {
    // Twilio errors carry a `.code` and `.message`; surface them for the admin UI.
    const detail = error?.message || 'Failed to send text message.';
    return NextResponse.json({ success: false, error: detail, code: error?.code }, { status: 500 });
  }
}
