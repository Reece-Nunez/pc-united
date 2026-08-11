import { NextRequest, NextResponse } from 'next/server';
import { toE164, sendSms } from '@/lib/sms';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { to, token, playerName } = await request.json();

    if (!to || !token) {
      return NextResponse.json({ success: false, error: 'Missing phone number or form token.' }, { status: 400 });
    }

    const toNumber = toE164(to);
    if (!toNumber) {
      return NextResponse.json({ success: false, error: `Invalid phone number: ${to}` }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poncacityunited.com';
    const link = `${baseUrl.replace(/\/$/, '')}/forms/medical/${token}`;
    const who = playerName ? ` for ${playerName}` : '';
    const body = `Ponca City United FC: Please complete & sign the player medical release form${who}: ${link}\n\nReply STOP to opt out.`;

    const { sid } = await sendSms(toNumber, body);

    return NextResponse.json({ success: true, sid, to: toNumber });
  } catch (error: any) {
    // Twilio errors carry a `.code` and `.message`; surface them for the admin UI.
    const detail = error?.message || 'Failed to send text message.';
    return NextResponse.json({ success: false, error: detail, code: error?.code }, { status: 500 });
  }
}
