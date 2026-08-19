import { describe, it, expect } from 'vitest';
import { shouldHandleCallback, parseCommand } from './groupme';

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
