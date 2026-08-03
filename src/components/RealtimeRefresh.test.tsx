import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';

// Capture the channel handlers so we can simulate a postgres change.
const handlers: Array<() => void> = [];
const subscribe = vi.fn();
const removeChannel = vi.fn();
const on = vi.fn((_evt: string, _filter: unknown, cb: () => void) => {
  handlers.push(cb);
  return channelObj;
});
const channelObj = { on, subscribe };
const channel = vi.fn(() => channelObj);
const refresh = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({ createClient: () => ({ channel, removeChannel }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import RealtimeRefresh from './RealtimeRefresh';

beforeEach(() => {
  handlers.length = 0;
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('RealtimeRefresh', () => {
  it('calls router.refresh() when a watched table changes', () => {
    render(<RealtimeRefresh tables={['schedule', 'events']} />);
    expect(on).toHaveBeenCalledTimes(2); // one listener per table
    expect(refresh).not.toHaveBeenCalled();

    act(() => { handlers[0](); vi.advanceTimersByTime(250); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
