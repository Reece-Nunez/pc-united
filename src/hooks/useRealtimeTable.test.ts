import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';

// Capture the postgres_changes handlers registered on the channel so the test
// can simulate change events, and expose channel/removeChannel spies.
const handlers: Array<() => void> = [];
const subscribe = vi.fn();
const removeChannel = vi.fn();
const on = vi.fn((_evt: string, _filter: unknown, cb: () => void) => {
  handlers.push(cb);
  return channelObj;
});
const channelObj = { on, subscribe };
const channel = vi.fn(() => channelObj);

vi.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({ channel, removeChannel }),
}));

import { useRealtimeTable } from './useRealtimeTable';

beforeEach(() => {
  handlers.length = 0;
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRealtimeTable', () => {
  it('subscribes to each table and refetches (debounced) on a change', () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable(['parent_children', 'event_attendance'], onChange));

    // One channel, one listener per table, subscribed once.
    expect(channel).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledTimes(1);

    // A burst of change events collapses into a single refetch after debounce.
    act(() => {
      handlers.forEach((h) => h());
      handlers.forEach((h) => h());
    });
    expect(onChange).not.toHaveBeenCalled(); // still within debounce window
    act(() => { vi.advanceTimersByTime(250); });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when disabled', () => {
    renderHook(() => useRealtimeTable('admin_notifications', vi.fn(), { enabled: false }));
    expect(channel).not.toHaveBeenCalled();
  });

  it('removes the channel on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeTable('admin_notifications', vi.fn()));
    expect(removeChannel).not.toHaveBeenCalled();
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });

  it('uses the latest callback without re-subscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useRealtimeTable('admin_notifications', cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });

    // Still one subscription despite the callback identity changing.
    expect(channel).toHaveBeenCalledTimes(1);
    act(() => { handlers[0](); vi.advanceTimersByTime(250); });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
