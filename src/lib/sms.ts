import twilio from 'twilio';

/**
 * Normalize a US phone number to E.164 (+1XXXXXXXXXX). Accepts input with
 * spaces, dashes, parens, or a leading +/1. Returns null if it can't be made valid.
 */
export function toE164(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if ((raw || '').trim().startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/**
 * Send one SMS via Twilio. Throws if Twilio env vars are missing so callers
 * surface a clear config error instead of failing silently.
 * `to` must already be E.164 (run through toE164 first).
 */
export async function sendSms(to: string, body: string): Promise<{ sid: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID).');
  }

  const client = twilio(accountSid, authToken);
  const message = await client.messages.create({
    to,
    body,
    ...(messagingServiceSid ? { messagingServiceSid } : { from }),
  });
  return { sid: message.sid };
}
