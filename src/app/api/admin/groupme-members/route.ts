import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { parseTeamBots } from '@/lib/groupme';
import { suggestMemberMatches, type GroupMeMember } from '@/lib/groupme-rsvp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'approved' && role !== 'admin') return null;
  return user;
}

/**
 * GET — every GroupMe member across both groups, with their current mapping
 * and (for unmapped ones) surname-based suggestions.
 *
 * The member list has to come from GroupMe live: there is no webhook for
 * joins/leaves, so a cached copy would silently go stale as families come and go.
 */
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = process.env.GROUPME_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'GROUPME_ACCESS_TOKEN not configured' }, { status: 500 });

  try {
    const admin = getAdminClient();
    const targets = parseTeamBots(process.env.GROUPME_TEAM_BOTS).filter(t => t.groupId);

    // A parent in both chats appears once, tagged with every group they're in.
    const byUser = new Map<string, GroupMeMember & { groups: string[] }>();
    for (const t of targets) {
      const res = await fetch(`https://api.groupme.com/v3/groups/${t.groupId}`, {
        headers: { 'X-Access-Token': token },
      });
      if (!res.ok) continue;
      const members = (await res.json())?.response?.members || [];
      for (const m of members) {
        const existing = byUser.get(m.user_id);
        if (existing) existing.groups.push(t.key);
        else byUser.set(m.user_id, { user_id: m.user_id, nickname: m.nickname, name: m.name, groups: [t.key] });
      }
    }
    const members = [...byUser.values()];

    const [mapRes, linksRes, playersRes, teamsRes] = await Promise.all([
      admin.from('groupme_member_map').select('*'),
      admin.from('parent_children').select('parent_user_id, parent_name, player_id, status'),
      admin.from('players').select('id, name, team_id, status'),
      admin.from('teams').select('id, name'),
    ]);

    const players = (playersRes.data || []).filter((p: any) => !p.status || p.status === 'active');
    const suggestions = suggestMemberMatches(
      members, (linksRes.data || []) as any, players as any, (mapRes.data || []) as any,
    );

    return NextResponse.json({
      members,
      mappings: mapRes.data || [],
      suggestions,
      parents: linksRes.data || [],
      players,
      teams: teamsRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load members' }, { status: 500 });
  }
}

/**
 * POST — save one mapping. Body: { groupme_user_id, groupme_name,
 * parent_user_id? , player_id?, ignored? }. Passing neither a parent nor a
 * player nor `ignored` clears the mapping.
 */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const groupmeUserId = String(body?.groupme_user_id || '');
  if (!groupmeUserId) return NextResponse.json({ error: 'groupme_user_id required' }, { status: 400 });

  const parentUserId = body.parent_user_id || null;
  const playerId = body.player_id != null ? Number(body.player_id) : null;
  const ignored = !!body.ignored;

  // A member is one thing or the other; both set would make the RSVP expansion
  // ambiguous about which players it covers.
  if (parentUserId && playerId != null) {
    return NextResponse.json({ error: 'Set a parent or a player, not both' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    if (!parentUserId && playerId == null && !ignored) {
      await admin.from('groupme_member_map').delete().eq('groupme_user_id', groupmeUserId);
      return NextResponse.json({ ok: true, cleared: true });
    }
    const { error } = await admin.from('groupme_member_map').upsert({
      groupme_user_id: groupmeUserId,
      groupme_name: body.groupme_name || null,
      parent_user_id: parentUserId,
      player_id: playerId,
      ignored,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'groupme_user_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save' }, { status: 500 });
  }
}
