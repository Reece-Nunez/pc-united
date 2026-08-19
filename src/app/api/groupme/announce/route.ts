import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { buildCancellationMessage } from '@/lib/reminders';
import { parseTeamBots, targetsForItem } from '@/lib/groupme';
import { postAndLog } from '@/lib/groupme-log';
import type { Schedule, Team } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mirrors middleware.ts: only approved coaches/admins may broadcast to the
// team groups. Anyone who could call this unauthenticated could post arbitrary
// "game cancelled" messages to every parent in the club.
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'approved' && role !== 'admin') return null;
  return user;
}

/**
 * POST { scheduleId } — announce a cancelled/postponed game immediately.
 *
 * Deliberately not part of the daily cron. A cancellation that arrives with
 * tomorrow's reminder is worthless: the point is to catch families before they
 * drive to the field, which means posting the moment a coach flips the status.
 *
 * The message is built from the row as stored, not from the request body, so a
 * caller cannot dictate arbitrary text into the group chats. The only thing the
 * caller chooses is *which game* to announce.
 */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targets = parseTeamBots(process.env.GROUPME_TEAM_BOTS);
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'GROUPME_TEAM_BOTS not configured' });
  }

  let scheduleId: number;
  try {
    const body = await request.json();
    scheduleId = Number(body?.scheduleId);
    if (!Number.isFinite(scheduleId)) throw new Error('bad id');
  } catch {
    return NextResponse.json({ error: 'scheduleId required' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const [gameRes, teamsRes, logRes] = await Promise.all([
      admin.from('schedule').select('*').eq('id', scheduleId).single(),
      admin.from('teams').select('id, name'),
      admin.from('groupme_announcement_log').select('bot_key, kind').eq('item_kind', 'game').eq('item_id', scheduleId),
    ]);
    if (gameRes.error) return NextResponse.json({ error: gameRes.error.message }, { status: 404 });

    const game = gameRes.data as Schedule;
    const message = buildCancellationMessage(game, (teamsRes.data || []) as Team[]);
    // Not cancelled or postponed — an ordinary edit, nothing to announce.
    if (!message) return NextResponse.json({ ok: true, skipped: 'game is not cancelled or postponed' });

    const already = new Set((logRes.data || []).map(r => `${r.kind}:${r.bot_key}`));
    let posted = 0, skipped = 0;
    const errors: string[] = [];

    for (const target of targetsForItem(targets, game.team_id ?? null)) {
      const key = `${game.status}:${target.key}`;
      if (already.has(key)) { skipped++; continue; }

      const ok = await postAndLog({
        admin, target, message, kind: 'cancellation', itemKind: 'game', itemId: scheduleId,
      });
      if (!ok) { errors.push(`post ${key}: GroupMe rejected the message`); continue; }

      posted++;
      const { error: logError } = await admin.from('groupme_announcement_log').insert({
        item_kind: 'game', item_id: scheduleId, kind: game.status, bot_key: target.key,
      });
      if (logError) errors.push(`log ${key}: ${logError.message}`);
    }

    return NextResponse.json({ ok: true, posted, skipped, errors });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Announce failed' }, { status: 500 });
  }
}
