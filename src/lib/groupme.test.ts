import { describe, it, expect } from 'vitest';
import { shouldHandleCallback, parseCommand, parseTeamBots, targetsForItem, targetForGroup } from './groupme';

describe('shouldHandleCallback', () => {
  const base = { group_id: 'g1', sender_type: 'user', text: 'hello', system: false };

  it('accepts a normal message from the bound group', () => {
    expect(shouldHandleCallback(base, 'g1')).toBe(true);
  });

  it('drops the bot\'s own messages so it cannot reply to itself forever', () => {
    expect(shouldHandleCallback({ ...base, sender_type: 'bot' }, 'g1')).toBe(false);
  });

  it('drops GroupMe system notices like "X joined the group"', () => {
    expect(shouldHandleCallback({ ...base, system: true }, 'g1')).toBe(false);
  });

  it('drops messages from a group this deployment is not bound to', () => {
    expect(shouldHandleCallback({ ...base, group_id: 'someone-else' }, 'g1')).toBe(false);
  });

  it('accepts any group when no group id is configured', () => {
    expect(shouldHandleCallback({ ...base, group_id: 'whatever' }, undefined)).toBe(true);
  });

  it('drops payloads with no text (image-only posts, malformed bodies)', () => {
    expect(shouldHandleCallback({ ...base, text: undefined }, 'g1')).toBe(false);
  });
});

describe('parseCommand', () => {
  it('reads a leading !command, case-insensitively', () => {
    expect(parseCommand('!next')).toBe('next');
    expect(parseCommand('!NEXT')).toBe('next');
    expect(parseCommand('  !Help  ')).toBe('help');
  });

  it('reads the command when followed by more words', () => {
    expect(parseCommand('!next game please')).toBe('next');
  });

  it('ignores ordinary chat and mid-sentence bangs', () => {
    expect(parseCommand('what time is the next game?')).toBeNull();
    expect(parseCommand('great win!next time we go again')).toBeNull();
  });

  it('ignores a bare bang or non-letter command', () => {
    expect(parseCommand('!')).toBeNull();
    expect(parseCommand('!123')).toBeNull();
  });
});

describe('parseTeamBots', () => {
  it('maps team ids to bot ids', () => {
    const targets = parseTeamBots('{"1":"botA","2":"botB"}');
    expect(targets).toEqual([
      { key: '1', botId: 'botA', teamId: 1, groupId: null },
      { key: '2', botId: 'botB', teamId: 2, groupId: null },
    ]);
  });

  it('treats the "all" key as a group with no team binding', () => {
    expect(parseTeamBots('{"all":"botA"}')).toEqual([{ key: 'all', botId: 'botA', teamId: null, groupId: null }]);
  });

  it('returns empty for unset, blank, or malformed JSON rather than throwing', () => {
    // A bad env var should stop reminders, not crash an unrelated request.
    expect(parseTeamBots(undefined)).toEqual([]);
    expect(parseTeamBots('   ')).toEqual([]);
    expect(parseTeamBots('not json')).toEqual([]);
    expect(parseTeamBots('["botA"]')).toEqual([]);
  });

  it('drops entries with an empty bot id or a non-numeric team key', () => {
    expect(parseTeamBots('{"1":"","2":"botB"}')).toEqual([{ key: '2', botId: 'botB', teamId: 2, groupId: null }]);
    expect(parseTeamBots('{"purple":"botA"}')).toEqual([]);
  });
});

describe('targetsForItem', () => {
  const targets = [
    { key: '1', botId: 'botA', teamId: 1, groupId: '111' },
    { key: '2', botId: 'botB', teamId: 2, groupId: '222' },
  ];

  it('sends a team item only to that team\'s group', () => {
    expect(targetsForItem(targets, 1).map(t => t.botId)).toEqual(['botA']);
  });

  it('sends a club-wide item to every group', () => {
    // A whole-club meeting has no team_id and must not be silently dropped.
    expect(targetsForItem(targets, null).map(t => t.botId)).toEqual(['botA', 'botB']);
  });

  it('reaches nobody when the team has no configured group', () => {
    expect(targetsForItem(targets, 99)).toEqual([]);
  });

  it('includes an untethered "all" group alongside the team group', () => {
    const withAll = [...targets, { key: 'all', botId: 'botC', teamId: null, groupId: null }];
    expect(targetsForItem(withAll, 1).map(t => t.botId)).toEqual(['botA', 'botC']);
  });
});

describe('parseTeamBots with group ids', () => {
  it('splits "botId:groupId" so inbound commands can be routed back', () => {
    expect(parseTeamBots('{"1":"botA:115589041"}')).toEqual([
      { key: '1', botId: 'botA', teamId: 1, groupId: '115589041' },
    ]);
  });

  it('still accepts a bare bot id, with no group binding', () => {
    expect(parseTeamBots('{"1":"botA"}')[0].groupId).toBeNull();
  });

  it('drops an entry that is only a group id with no bot', () => {
    expect(parseTeamBots('{"1":":115589041"}')).toEqual([]);
  });
});

describe('targetForGroup', () => {
  const targets = [
    { key: '1', botId: 'botA', teamId: 1, groupId: '111' },
    { key: '2', botId: 'botB', teamId: 2, groupId: '222' },
  ];

  it('answers in the group that asked', () => {
    // A command in the U11 chat must never be answered in the U12 chat.
    expect(targetForGroup(targets, '222')?.botId).toBe('botB');
  });

  it('returns null for an unknown or missing group', () => {
    expect(targetForGroup(targets, '999')).toBeNull();
    expect(targetForGroup(targets, undefined)).toBeNull();
  });
});
