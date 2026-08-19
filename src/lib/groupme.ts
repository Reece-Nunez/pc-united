// GroupMe bot integration.
//
// Outbound: the club posts into the group by POSTing a bot id + text to the
// GroupMe bot API. No per-message auth beyond the bot id, which is a secret.
//
// Inbound: GroupMe POSTs every group message to a callback URL. Two things make
// that awkward and both are handled in the route:
//
//  1. GroupMe does NOT sign its callbacks — there is no shared-secret HMAC like
//     Twilio's. Anyone who learns the URL can POST arbitrary JSON to it. The
//     mitigation is a secret path segment (GROUPME_CALLBACK_TOKEN) plus checking
//     the payload's group_id, so the URL itself is the credential. Treat it like
//     a password: never log it, rotate it if it leaks.
//  2. The bot sees its own posts. Replying to them loops forever, so anything
//     with sender_type "bot" is dropped before command handling.

const GROUPME_POST_URL = 'https://api.groupme.com/v3/bots/post';

/** The subset of GroupMe's callback payload we actually rely on. */
export interface GroupMeCallback {
  group_id?: string;
  sender_id?: string;
  sender_type?: string;
  name?: string;
  text?: string;
  system?: boolean;
  attachments?: unknown[];
}

/**
 * Whether a callback should be acted on.
 *
 * Rejects the bot's own messages (loop guard), GroupMe system notices
 * ("X joined the group"), and anything from a different group than the one this
 * deployment is bound to.
 */
export function shouldHandleCallback(
  body: GroupMeCallback,
  expectedGroupId: string | undefined,
): boolean {
  if (!body || typeof body.text !== 'string') return false;
  if (body.sender_type === 'bot') return false;
  if (body.system === true) return false;
  if (expectedGroupId && body.group_id !== expectedGroupId) return false;
  return true;
}

/** Commands are `!word`, case-insensitive, at the start of the message. */
export function parseCommand(text: string): string | null {
  const match = /^\s*!([a-z]+)\b/i.exec(text);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Post a message into the group.
 *
 * Returns false rather than throwing when the bot isn't configured, so callers
 * in a webhook can keep returning 200 — GroupMe retries non-2xx responses, and
 * retrying a message we can't send is pointless noise.
 */
export async function postToGroupMe(text: string, botId = process.env.GROUPME_BOT_ID): Promise<boolean> {
  if (!botId) return false;
  // GroupMe truncates past 1000 chars; trim ourselves so the cut is clean.
  const body = text.length > 1000 ? `${text.slice(0, 997)}...` : text;
  try {
    const res = await fetch(GROUPME_POST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id: botId, text: body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
