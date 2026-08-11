import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { getAdminClient } from '@/lib/supabase-admin';
import { toE164 } from '@/lib/sms';
import { parseRsvpReply, reminderItemLabel } from '@/lib/reminders';
import { CLUB_TIME_ZONE } from '@/lib/time';
import type { Team } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Twilio expects a TwiML response; the <Message> body is texted back.
function twiml(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function clubToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// POST: Twilio incoming-message webhook (configure on the Twilio number).
// A parent replying YES/NO/MAYBE to the morning reminder gets their kids'
// RSVP upserted into event_attendance for every item they were reminded
// about today — the same rows the RSVP page and admin attendance page use.
export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });

  const params: Record<string, string> = {};
  (await request.formData()).forEach((v, k) => { params[k] = String(v); });

  // Verify the request really came from Twilio — this endpoint is public.
  // The signature is computed over the exact public URL Twilio called.
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://poncacityunited.com').replace(/\/$/, '');
  const signature = request.headers.get('x-twilio-signature') || '';
  if (!twilio.validateRequest(authToken, signature, `${baseUrl}/api/sms/webhook`, params)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const from = toE164(params.From || '');
  const rsvp = parseRsvpReply(params.Body || '');
  if (!from) return twiml('Sorry, we could not identify your number.');
  if (!rsvp) return twiml('Reply YES if going, NO if not, or MAYBE.');

  try {
    const admin = getAdminClient();
    const today = clubToday();

    // Which practice/game reminders did this phone get today?
    const { data: logRows, error: logError } = await admin
      .from('sms_reminder_log')
      .select('item_kind, item_id')
      .eq('remind_date', today)
      .eq('phone', from)
      .in('item_kind', ['event', 'game']);
    if (logError) throw new Error(logError.message);
    if (!logRows?.length) {
      return twiml('Thanks! There is no practice or game reminder for you today.');
    }

    // The parent's kids (approved links only), matched by normalized phone.
    const { data: links, error: linksError } = await admin
      .from('parent_children')
      .select('parent_name, parent_phone, status, players(id, name, team_id)')
      .eq('status', 'approved');
    if (linksError) throw new Error(linksError.message);
    const mine = (links || []).filter((l: any) => toE164(l.parent_phone || '') === from && l.players);
    if (!mine.length) {
      return twiml('We could not find an approved parent account for this number. Please RSVP on the website.');
    }
    const parentName = mine[0].parent_name || 'parent';

    const eventIds = logRows.filter(r => r.item_kind === 'event').map(r => r.item_id);
    const gameIds = logRows.filter(r => r.item_kind === 'game').map(r => r.item_id);
    const [eventsRes, gamesRes, teamsRes] = await Promise.all([
      eventIds.length ? admin.from('events').select('id, team_id').in('id', eventIds) : Promise.resolve({ data: [], error: null }),
      gameIds.length ? admin.from('schedule').select('id, team_id, opponent, home_game').in('id', gameIds) : Promise.resolve({ data: [], error: null }),
      admin.from('teams').select('id, name'),
    ]);
    const teams = (teamsRes.data || []) as Team[];

    // Upsert one attendance row per (item × kid on that item's team).
    const rows: any[] = [];
    const labels: string[] = [];
    const kidNames = new Set<string>();
    const applyItem = (kind: 'event' | 'game', item: any) => {
      const kids = mine
        .map((l: any) => l.players)
        .filter((p: any) => item.team_id == null || p.team_id === item.team_id);
      if (!kids.length) return;
      labels.push(reminderItemLabel(kind, item, teams));
      for (const kid of kids) {
        kidNames.add(kid.name);
        rows.push({
          event_id: kind === 'event' ? item.id : null,
          schedule_id: kind === 'game' ? item.id : null,
          player_id: kid.id,
          rsvp,
          rsvp_by: `${parentName} (SMS)`,
          updated_at: new Date().toISOString(),
        });
      }
    };
    (eventsRes.data || []).forEach((e: any) => applyItem('event', e));
    (gamesRes.data || []).forEach((g: any) => applyItem('game', g));

    if (!rows.length) {
      return twiml('Thanks! There is no practice or game reminder for your kids today.');
    }

    const { error: upsertError } = await admin
      .from('event_attendance')
      .upsert(rows, { onConflict: 'event_id,schedule_id,player_id' });
    if (upsertError) throw new Error(upsertError.message);

    const kidList = [...kidNames].join(' & ');
    const verb = rsvp === 'going' ? 'going to' : rsvp === 'maybe' ? 'a maybe for' : 'not going to';
    return twiml(`Got it — ${kidList} marked as ${verb} today's ${labels.join(' and ')}. You can change this anytime by replying again.`);
  } catch {
    return twiml('Sorry, something went wrong saving your RSVP. Please try the website.');
  }
}
