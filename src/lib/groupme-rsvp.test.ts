import { describe, it, expect } from 'vitest';
import {
  surname, suggestMemberMatches, buildAttendanceRows, unmappedMembers, DRAFT_MARKER,
  type GroupMeMember, type ParentLink, type RosterPlayer, type MemberMapRow,
} from './groupme-rsvp';

const PLAYERS: RosterPlayer[] = [
  { id: 1, name: 'Ryver Hoy', team_id: 2 },
  { id: 2, name: 'Sam Hoy', team_id: 1 },
  { id: 3, name: 'Owen Roberts', team_id: 2 },
  { id: 4, name: 'Alex Chen', team_id: 1 },
];

const LINKS: ParentLink[] = [
  { parent_user_id: 'p-hoy', parent_name: 'Richard Hoy', player_id: 1, status: 'approved' },
  { parent_user_id: 'p-hoy', parent_name: 'Richard Hoy', player_id: 2, status: 'approved' },
  { parent_user_id: 'p-rob', parent_name: 'Dana Roberts', player_id: 3, status: 'approved' },
  { parent_user_id: 'p-pending', parent_name: 'Nope Chen', player_id: 4, status: 'pending' },
];

const member = (user_id: string, nickname: string): GroupMeMember => ({ user_id, nickname, name: nickname });

describe('surname', () => {
  it('takes the last token', () => {
    expect(surname('Richard Hoy')).toBe('hoy');
    expect(surname('Mary Anne Roberts')).toBe('roberts');
  });

  it('is empty for a single-token name, which must not match anything', () => {
    // "Taylor" is a real member with a nickname only — guessing would be worse
    // than leaving them unmapped.
    expect(surname('Taylor')).toBe('');
    expect(surname('')).toBe('');
  });
});

describe('suggestMemberMatches', () => {
  const members = [member('u1', 'Richard Hoy'), member('u2', 'Taylor'), member('u3', 'Dana Roberts')];

  it('confidently matches a unique surname', () => {
    const s = suggestMemberMatches(members, LINKS, PLAYERS).find(x => x.member.user_id === 'u1')!;
    expect(s.confident).toBe(true);
    expect(s.suggestedParents[0].parentUserId).toBe('p-hoy');
    expect(s.suggestedParents[0].playerIds).toEqual([1, 2]);
  });

  it('leaves a nickname-only member unmatched rather than guessing', () => {
    const s = suggestMemberMatches(members, LINKS, PLAYERS).find(x => x.member.user_id === 'u2')!;
    expect(s.confident).toBe(false);
    expect(s.suggestedParents).toEqual([]);
    expect(s.suggestedPlayers).toEqual([]);
  });

  it('is not confident when two parents share a surname', () => {
    const twoHoys: ParentLink[] = [
      ...LINKS,
      { parent_user_id: 'p-hoy2', parent_name: 'Karen Hoy', player_id: 1, status: 'approved' },
    ];
    const s = suggestMemberMatches(members, twoHoys, PLAYERS).find(x => x.member.user_id === 'u1')!;
    expect(s.suggestedParents).toHaveLength(2);
    expect(s.confident).toBe(false);
  });

  it('ignores parent links that are not approved', () => {
    const s = suggestMemberMatches([member('u9', 'Nope Chen')], LINKS, PLAYERS)[0];
    expect(s.suggestedParents).toEqual([]);
  });

  it('suggests players directly for a member with no parent account', () => {
    const s = suggestMemberMatches([member('u9', 'Pat Roberts')], [], PLAYERS)[0];
    expect(s.suggestedPlayers.map(p => p.id)).toEqual([3]);
  });

  it('skips members that are already mapped', () => {
    const mapped: MemberMapRow[] = [{ groupme_user_id: 'u1' }];
    expect(suggestMemberMatches(members, LINKS, PLAYERS, mapped).map(s => s.member.user_id))
      .toEqual(['u2', 'u3']);
  });
});

describe('buildAttendanceRows', () => {
  const MAP: MemberMapRow[] = [
    { groupme_user_id: 'u1', parent_user_id: 'p-hoy' },   // children 1 (U12) and 2 (U11)
    { groupme_user_id: 'u3', parent_user_id: 'p-rob' },   // child 3 (U12)
    { groupme_user_id: 'u4', ignored: true },             // a coach
  ];
  const target = { eventId: 10, scheduleId: null, teamId: 2 };

  it('expands a parent RSVP to their children on the asking team only', () => {
    // Richard Hoy has a child in each age group; a U12 RSVP must not mark the
    // U11 child as going.
    const rows = buildAttendanceRows({ going: ['u1'] }, MAP, LINKS, PLAYERS, target);
    expect(rows.map(r => r.player_id)).toEqual([1]);
    expect(rows[0].rsvp).toBe('going');
  });

  it('covers every child when the item is club-wide', () => {
    const rows = buildAttendanceRows({ going: ['u1'] }, MAP, LINKS, PLAYERS,
      { eventId: 10, scheduleId: null, teamId: null });
    expect(rows.map(r => r.player_id).sort()).toEqual([1, 2]);
  });

  it('drafts attendance for "going" only, marked as unreviewed', () => {
    const rows = buildAttendanceRows(
      { going: ['u1'], maybe_going: ['u3'] }, MAP, LINKS, PLAYERS, target,
    );
    const going = rows.find(r => r.player_id === 1)!;
    const maybe = rows.find(r => r.player_id === 3)!;
    expect(going.attendance).toBe('present');
    expect(going.marked_by).toBe(DRAFT_MARKER);
    // A "maybe" says nothing about turning up — don't put words in the coach's mouth.
    expect(maybe.attendance).toBeUndefined();
    expect(maybe.marked_by).toBeUndefined();
  });

  it('can skip the draft entirely', () => {
    const rows = buildAttendanceRows({ going: ['u1'] }, MAP, LINKS, PLAYERS, target, false);
    expect(rows[0].attendance).toBeUndefined();
  });

  it('lets an explicit no override a stale yes for the same player', () => {
    const rows = buildAttendanceRows({ going: ['u1'], not_going: ['u1'] }, MAP, LINKS, PLAYERS, target);
    expect(rows).toHaveLength(1);
    expect(rows[0].rsvp).toBe('not_going');
    expect(rows[0].attendance).toBeUndefined();
  });

  it('ignores unmapped and explicitly ignored members', () => {
    expect(buildAttendanceRows({ going: ['unknown-user', 'u4'] }, MAP, LINKS, PLAYERS, target)).toEqual([]);
  });

  it('records which GroupMe user the RSVP came from', () => {
    const rows = buildAttendanceRows({ going: ['u1'] }, MAP, LINKS, PLAYERS, target);
    expect(rows[0].rsvp_by).toBe('groupme:u1');
  });

  it('targets a game via schedule_id instead of event_id', () => {
    const rows = buildAttendanceRows({ going: ['u3'] }, MAP, LINKS, PLAYERS,
      { eventId: null, scheduleId: 55, teamId: 2 });
    expect(rows[0]).toMatchObject({ event_id: null, schedule_id: 55, player_id: 3 });
  });
});

describe('unmappedMembers', () => {
  it('lists only members with no mapping row', () => {
    const members = [member('u1', 'A'), member('u2', 'B')];
    expect(unmappedMembers(members, [{ groupme_user_id: 'u1' }]).map(m => m.user_id)).toEqual(['u2']);
  });
});
