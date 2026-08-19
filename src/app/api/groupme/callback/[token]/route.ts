import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import {
  shouldHandleCallback, parseCommand, parseTeamBots, targetForGroup, postToGroupMe,
  type GroupMeCallback, type GroupTarget,
} from '@/lib/groupme';
import { postAndLog } from '@/lib/groupme-log';
import {
  formatNextGame, formatSchedule, formatNextPractice, formatField,
  formatRecord, formatRoster, formatHelp,
} from '@/lib/groupme-commands';
import { clubStartOfTodayISO } from '@/lib/time';
import { getCurrentSeason } from '@/lib/seasons';
import type { Schedule, Event, Player, Team } from '@/lib/supabase';

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

  // Resolve the asking group first: it decides both which team the answer is
  // scoped to and which chat the reply goes back into. A command in the U11
  // chat must never be answered with U12 fixtures, or in the U12 chat.
  const target: GroupTarget = targetForGroup(parseTeamBots(process.env.GROUPME_TEAM_BOTS), body.group_id)
    ?? { key: 'all', botId: process.env.GROUPME_BOT_ID || '', teamId: null, groupId: body.group_id ?? null };
  if (!target.botId) return NextResponse.json({ ok: true, skipped: 'no bot configured for this group' });

  // A thrown error here (missing service-role key, Supabase down) must not turn
  // into a 5xx, or GroupMe will retry the same message on a loop.
  let reply: string | null = null;
  try {
    reply = await buildReply(command, target.teamId);
  } catch {
    reply = null;
  }
  if (!reply) return NextResponse.json({ ok: true, ignored: 'unknown command' });

  try {
    await postAndLog({ admin: getAdminClient(), target, message: reply, kind: 'command_reply' });
  } catch {
    // Logging unavailable (e.g. missing service key) must not swallow the reply.
    await postToGroupMe(reply, target.botId);
  }

  return NextResponse.json({ ok: true, handled: command });
}

/**
 * Answer a `!command`, scoped to the asking group's team.
 *
 * Deliberately limited to information already public on the site. Anything tied
 * to an individual — dues balances, contact details, medical forms, coach-only
 * player notes — must never be answerable here: a GroupMe group is a shared
 * room, and any member could ask on another family's behalf.
 */
async function buildReply(command: string, teamId: number | null): Promise<string | null> {
  if (command === 'help') return formatHelp();

  const admin = getAdminClient();
  const from = clubStartOfTodayISO();

  const upcomingGames = async (limit: number) => {
    const { data } = await admin.from('schedule')
      .select('opponent, game_date, time_tbd, location, home_game, status, team_id')
      .eq('status', 'scheduled').gte('game_date', from)
      .order('game_date', { ascending: true }).limit(limit);
    return (data || []) as Schedule[];
  };
  const teams = async () => {
    const { data } = await admin.from('teams').select('id, name');
    return (data || []) as Team[];
  };

  switch (command) {
    case 'next':
      return formatNextGame(await upcomingGames(20), await teams(), teamId);

    case 'schedule':
      return formatSchedule(await upcomingGames(20), await teams(), teamId);

    case 'practice': {
      const { data } = await admin.from('events')
        .select('id, title, event_date, time_tbd, location, event_type, team_id')
        .eq('event_type', 'practice').gte('event_date', from)
        .order('event_date', { ascending: true }).limit(20);
      return formatNextPractice((data || []) as Event[], teamId);
    }

    case 'field':
    case 'where': {
      const { data: events } = await admin.from('events')
        .select('id, title, event_date, time_tbd, location, event_type, team_id')
        .gte('event_date', from).order('event_date', { ascending: true }).limit(20);
      return formatField(await upcomingGames(20), (events || []) as Event[], teamId);
    }

    case 'record': {
      // Season-scoped: a lifetime record is not what anyone means by "!record".
      const season = getCurrentSeason();
      const seasonStart = season.startDate.toISOString().slice(0, 10);
      const { data } = await admin.from('schedule')
        .select('our_score, opponent_score, status, game_date, team_id')
        .eq('status', 'completed').gte('game_date', seasonStart);
      return formatRecord((data || []) as Schedule[], teamId, season.label);
    }

    case 'roster': {
      // Only the three public fields — the row also carries coach_notes,
      // strengths and areas_to_improve, which must never reach a group chat.
      const { data } = await admin.from('players')
        .select('id, name, jersey_number, position, status, team_id');
      return formatRoster((data || []) as Player[], teamId, await teams());
    }

    default:
      return null;
  }
}
