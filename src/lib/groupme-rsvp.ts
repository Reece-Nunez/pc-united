// Turning GroupMe event RSVPs into event_attendance rows.
//
// Two things make this fiddly, and both are handled here rather than in the
// route so they can be tested:
//
// 1. GroupMe identifies RSVPs by bare user id and exposes no email or phone, so
//    there is no key that joins to parent_children. A human maps members once
//    (groupme_member_map); `suggestMemberMatches` only proposes the obvious
//    ones to make that job shorter.
// 2. Group members are *parents*. An RSVP from one parent applies to every
//    child of theirs on that team — and only that team, since a parent with
//    kids in both age groups RSVPs separately in each group.

/** GroupMe's three RSVP buckets, mapped to the values event_attendance stores. */
export type Rsvp = 'going' | 'maybe' | 'not_going';

export interface GroupMeMember {
  user_id: string;
  nickname?: string | null;
  name?: string | null;
}

export interface MemberMapRow {
  groupme_user_id: string;
  parent_user_id?: string | null;
  player_id?: number | null;
  ignored?: boolean | null;
}

export interface ParentLink {
  parent_user_id: string | null;
  parent_name?: string | null;
  player_id: number;
  status: string;
}

export interface RosterPlayer {
  id: number;
  name: string;
  team_id?: number | null;
}

/** Marks an attendance row as an unreviewed draft written by the sync, not a
 *  coach. The attendance UI badges these so a draft can't quietly become the
 *  record — see the coach-confirmation note in the admin attendance page. */
export const DRAFT_MARKER = 'groupme:auto';

const displayName = (m: GroupMeMember) => (m.nickname || m.name || '').trim();

/** Last whitespace-separated token, lowercased. "Richard Hoy" → "hoy". */
export function surname(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export interface MemberSuggestion {
  member: GroupMeMember;
  displayName: string;
  /** Parent links whose surname matches the member's. */
  suggestedParents: { parentUserId: string; parentName: string; playerIds: number[] }[];
  /** Players whose surname matches, for a member with no parent account. */
  suggestedPlayers: RosterPlayer[];
  /** True when exactly one parent matched — safe to preselect. */
  confident: boolean;
}

/**
 * Propose matches for unmapped members by surname.
 *
 * Deliberately conservative: a suggestion is only `confident` when exactly one
 * parent shares the surname. Anything ambiguous (two Hoys) or unmatchable
 * (a member called just "Taylor") is left for the human, because a wrong
 * mapping silently attributes one family's RSVPs to another.
 */
export function suggestMemberMatches(
  members: GroupMeMember[],
  parentLinks: ParentLink[],
  players: RosterPlayer[],
  alreadyMapped: MemberMapRow[] = [],
): MemberSuggestion[] {
  const mapped = new Set(alreadyMapped.map(m => m.groupme_user_id));

  // Group approved parent links into one entry per parent.
  const byParent = new Map<string, { parentName: string; playerIds: number[] }>();
  for (const l of parentLinks) {
    if (l.status !== 'approved' || !l.parent_user_id) continue;
    const entry = byParent.get(l.parent_user_id) || { parentName: l.parent_name || '', playerIds: [] };
    entry.playerIds.push(l.player_id);
    if (!entry.parentName && l.parent_name) entry.parentName = l.parent_name;
    byParent.set(l.parent_user_id, entry);
  }

  return members
    .filter(m => !mapped.has(m.user_id))
    .map(m => {
      const name = displayName(m);
      const sn = surname(name);
      const suggestedParents = sn
        ? [...byParent.entries()]
            .filter(([, p]) => surname(p.parentName) === sn)
            .map(([parentUserId, p]) => ({ parentUserId, parentName: p.parentName, playerIds: p.playerIds }))
        : [];
      const suggestedPlayers = sn ? players.filter(p => surname(p.name) === sn) : [];
      return {
        member: m,
        displayName: name,
        suggestedParents,
        suggestedPlayers,
        confident: suggestedParents.length === 1,
      };
    });
}

export interface AttendanceRow {
  event_id: number | null;
  schedule_id: number | null;
  player_id: number;
  rsvp: Rsvp;
  rsvp_by: string;
  attendance?: string;
  marked_by?: string;
}

export interface RsvpBuckets {
  going: string[];
  maybe_going?: string[];
  not_going?: string[];
}

/**
 * Expand one event's RSVP buckets into per-player attendance rows.
 *
 * `teamId` scopes the result to the group that was asked: a parent with a child
 * in each age group RSVPs separately in each chat, so a U11 RSVP must not mark
 * their U12 child as going. A club-wide item (teamId null) covers all children.
 *
 * Rows carry `attendance` as an unreviewed draft (marked DRAFT_MARKER) only for
 * "going" — a maybe or a no says nothing about whether they turned up, and
 * pre-filling those would put words in the coach's mouth.
 */
export function buildAttendanceRows(
  buckets: RsvpBuckets,
  memberMap: MemberMapRow[],
  parentLinks: ParentLink[],
  players: RosterPlayer[],
  target: { eventId: number | null; scheduleId: number | null; teamId: number | null },
  prefillDraftAttendance = true,
): AttendanceRow[] {
  const byUser = new Map(memberMap.filter(m => !m.ignored).map(m => [m.groupme_user_id, m]));
  const playerById = new Map(players.map(p => [p.id, p]));

  const childrenOfParent = new Map<string, number[]>();
  for (const l of parentLinks) {
    if (l.status !== 'approved' || !l.parent_user_id) continue;
    childrenOfParent.set(l.parent_user_id, [...(childrenOfParent.get(l.parent_user_id) || []), l.player_id]);
  }

  const rows = new Map<number, AttendanceRow>();

  const apply = (userIds: string[] | undefined, rsvp: Rsvp) => {
    for (const uid of userIds || []) {
      const m = byUser.get(uid);
      if (!m) continue; // unmapped member — surfaced in the admin UI instead
      const playerIds = m.player_id != null
        ? [m.player_id]
        : (m.parent_user_id ? childrenOfParent.get(m.parent_user_id) || [] : []);

      for (const pid of playerIds) {
        const player = playerById.get(pid);
        if (!player) continue;
        // Only the children on the team whose group this RSVP came from.
        if (target.teamId !== null && player.team_id !== target.teamId) continue;

        const row: AttendanceRow = {
          event_id: target.eventId,
          schedule_id: target.scheduleId,
          player_id: pid,
          rsvp,
          rsvp_by: `groupme:${uid}`,
        };
        if (prefillDraftAttendance && rsvp === 'going') {
          row.attendance = 'present';
          row.marked_by = DRAFT_MARKER;
        }
        rows.set(pid, row);
      }
    }
  };

  // Applied last-wins per player, so an explicit no overrides a stale yes.
  apply(buckets.going, 'going');
  apply(buckets.maybe_going, 'maybe');
  apply(buckets.not_going, 'not_going');

  return [...rows.values()];
}

/** Members with no mapping yet — the admin UI's to-do list. */
export function unmappedMembers(members: GroupMeMember[], memberMap: MemberMapRow[]): GroupMeMember[] {
  const known = new Set(memberMap.map(m => m.groupme_user_id));
  return members.filter(m => !known.has(m.user_id));
}
