// Server-side GroupMe posting with an audit trail.
//
// Kept out of lib/groupme.ts so that file stays pure and unit-testable (no
// Supabase import). Everything here needs a service-role client, so it only
// ever runs in a route handler.

import { postToGroupMe, type GroupTarget } from './groupme';

export type GroupMeActivityKind = 'reminder' | 'cancellation' | 'command_reply' | 'test';

export interface PostAndLogArgs {
  /** Service-role Supabase client (getAdminClient()). */
  admin: any;
  target: Pick<GroupTarget, 'key' | 'botId' | 'teamId'>;
  message: string;
  kind: GroupMeActivityKind;
  itemKind?: 'event' | 'game' | null;
  itemId?: number | null;
}

/**
 * Post to one group and record the attempt.
 *
 * Returns whether the post succeeded; the caller decides what to do about a
 * failure. Logging is best-effort and never changes that answer — if the log
 * table is missing or the insert fails, the message was still delivered and
 * saying otherwise would make the caller retry a message people already saw.
 *
 * Failures are logged too, so a silent gap in a group chat has an explanation.
 */
export async function postAndLog({
  admin, target, message, kind, itemKind = null, itemId = null,
}: PostAndLogArgs): Promise<boolean> {
  let ok = false;
  let error: string | null = null;
  try {
    ok = await postToGroupMe(message, target.botId);
    if (!ok) error = 'GroupMe rejected the message';
  } catch (err: any) {
    error = err?.message || 'post threw';
  }

  try {
    await admin.from('groupme_activity_log').insert({
      kind,
      bot_key: target.key,
      team_id: target.teamId,
      item_kind: itemKind,
      item_id: itemId,
      message,
      ok,
      error,
    });
  } catch {
    // Audit trail is not worth failing a delivered message over.
  }

  return ok;
}
