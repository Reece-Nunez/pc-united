import { describe, it, expect } from 'vitest';
import { clubStartOfTodayISO, isClubTodayOrLater, parseClubDateTime } from './time';

describe('clubStartOfTodayISO', () => {
  it('returns start-of-day for the club (Central) date, not UTC', () => {
    // 2026-07-14 02:30 UTC is still 2026-07-13 21:30 in Central (UTC-5, summer).
    // The cutoff must reflect the Central date (the 13th), not the UTC date.
    const now = new Date('2026-07-14T02:30:00Z');
    expect(clubStartOfTodayISO(now)).toBe('2026-07-13T00:00:00');
  });

  it('keeps an evening practice on the correct day when viewed that afternoon', () => {
    // Regression: a 6:30 PM Central practice is stored as 18:30 wall-clock.
    // Viewed at 2:58 PM Central (19:58 UTC), the old filter used the UTC
    // instant and dropped it. The start-of-day cutoff must sort before it.
    const viewedAt = new Date('2026-07-14T19:58:00Z'); // 2:58 PM Central
    const cutoff = clubStartOfTodayISO(viewedAt);
    const storedPractice = '2026-07-14T18:30:00'; // 6:30 PM wall-clock
    expect(cutoff).toBe('2026-07-14T00:00:00');
    expect(cutoff <= storedPractice).toBe(true); // practice is included
  });

  it('produces a well-formed naive timestamp', () => {
    const s = clubStartOfTodayISO(new Date('2026-01-05T12:00:00Z'));
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/);
  });
});

describe('isClubTodayOrLater', () => {
  // Viewed at 2:58 PM Central (19:58 UTC) on 2026-07-14.
  const viewedAt = new Date('2026-07-14T19:58:00Z');

  it('keeps an evening game earlier in the same day', () => {
    // 6:30 PM game stored as wall-clock — must still count as today.
    expect(isClubTodayOrLater('2026-07-14T18:30:00+00:00', viewedAt)).toBe(true);
  });

  it('keeps a game later today', () => {
    expect(isClubTodayOrLater('2026-07-14T23:00:00+00:00', viewedAt)).toBe(true);
  });

  it('excludes a game from a previous day', () => {
    expect(isClubTodayOrLater('2026-07-13T20:00:00+00:00', viewedAt)).toBe(false);
  });

  it('handles empty input', () => {
    expect(isClubTodayOrLater('', viewedAt)).toBe(false);
  });
});

describe('parseClubDateTime', () => {
  it('renders the stored wall-clock time, not a UTC-shifted one', () => {
    // Regression: a 6:30 PM practice is stored as 18:30 and returned as
    // "…+00:00". The old `new Date(s)` treated it as a UTC instant and the
    // formatter subtracted the viewer's offset (showing 12:30 PM). Parsed as
    // wall-clock, the hour/minute must survive verbatim regardless of runner TZ.
    const d = parseClubDateTime('2026-08-04T18:30:00+00:00');
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(30);
    expect(d.getDate()).toBe(4);
  });

  it('handles a bare naive string with no offset', () => {
    const d = parseClubDateTime('2026-08-04T06:30');
    expect(d.getHours()).toBe(6);
    expect(d.getMinutes()).toBe(30);
  });

  it('strips a Z suffix as well as numeric offsets', () => {
    expect(parseClubDateTime('2026-08-04T23:00:00Z').getHours()).toBe(23);
  });
});
