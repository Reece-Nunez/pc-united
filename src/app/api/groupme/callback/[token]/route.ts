import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { shouldHandleCallback, parseCommand, postToGroupMe, type GroupMeCallback } from '@/lib/groupme';
import { clubStartOfTodayISO, formatClubTime, parseClubDateTime } from '@/lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GroupMe bot callback.
 *
 * Register this URL as the bot's callback at https://dev.groupme.com/bots:
 *
 *     https://poncacityunited.com/api/groupme/callback/<GROUPME_CALLBACK_TOKEN>
 *
 * The token in the path IS the credential — GroupMe sends no signature, so
 * there is nothing else to verify against. See src/lib/groupme.ts.
 *
 * Always returns 200 once the token checks out. GroupMe retries non-2xx
 * responses, and re-delivering a message we already chose to ignore (or failed
 * to answer) just doubles the noise.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const expectedToken = process.env.GROUPME_CALLBACK_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: 'GroupMe not configured' }, { status: 500 });
  }

  const { token } = await params;
  if (token !== expectedToken) {
    // 404 rather than 401: don't confirm to a prober that the path pattern is real.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: GroupMeCallback;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: 'unparseable body' });
  }

  if (!shouldHandleCallback(body, process.env.GROUPME_GROUP_ID)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const command = parseCommand(body.text || '');
  if (!command) return NextResponse.json({ ok: true, ignored: 'no command' });

  // A thrown error here (missing service-role key, Supabase down) must not turn
  // into a 5xx, or GroupMe will retry the same message on a loop.
  let reply: string | null = null;
  try {
    reply = await buildReply(command);
  } catch {
    reply = null;
  }
  if (reply) await postToGroupMe(reply);

  return NextResponse.json({ ok: true, handled: command });
}

/**
 * Answer a `!command`.
 *
 * Deliberately limited to information that is already public on the site.
 * Anything tied to an individual — dues balances, contact details, medical
 * forms — must never be answerable here: a GroupMe group is a shared room, and
 * any member could ask on another family's behalf.
 */
async function buildReply(command: string): Promise<string | null> {
  switch (command) {
    case 'next':
      return nextGameMessage();
    case 'help':
      return 'Commands: !next (next scheduled game), !help (this message).';
    default:
      return null;
  }
}

async function nextGameMessage(): Promise<string> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('schedule')
    .select('opponent, game_date, time_tbd, location, home_game, status')
    .gte('game_date', clubStartOfTodayISO())
    .eq('status', 'scheduled')
    .order('game_date', { ascending: true })
    .limit(1);

  if (error) return 'Could not look up the schedule right now.';
  const game = data?.[0];
  if (!game) return 'No upcoming games on the schedule yet.';

  const date = parseClubDateTime(game.game_date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const time = formatClubTime(game.game_date, game.time_tbd);
  const side = game.home_game ? 'vs' : 'at';
  const where = game.location ? ` — ${game.location}` : '';
  return `Next up: ${side} ${game.opponent}, ${date} at ${time}${where}`;
}
