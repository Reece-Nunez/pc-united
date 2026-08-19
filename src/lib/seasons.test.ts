import { describe, it, expect } from 'vitest';
import { parseLocalDate, isDateInSeason, getSeasonLabel, getSeasonForDate } from './seasons';

// Season boundaries (src/lib/seasons.ts):
//   Spring Mar 8 · Summer May 24 · Fall Sep 6 · Winter Nov 16

describe('parseLocalDate', () => {
  it('reads a bare YYYY-MM-DD as local midnight, not UTC', () => {
    // `new Date('2026-09-06')` is UTC midnight, which is Sep 5 in every US
    // timezone. Postgres `date` columns arrive in exactly this shape, so the
    // naive parse pushed boundary-dated money into the previous season.
    const d = parseLocalDate('2026-09-06');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // September
    expect(d.getDate()).toBe(6);
    expect(d.getHours()).toBe(0);
  });

  it('leaves timestamps that carry a zone to the normal parser', () => {
    const d = parseLocalDate('2026-09-06T15:30:00Z');
    expect(d.toISOString()).toBe('2026-09-06T15:30:00.000Z');
  });
});

describe('isDateInSeason', () => {
  const fall2026 = getSeasonForDate(new Date(2026, 8, 20));
  const summer2026 = getSeasonForDate(new Date(2026, 5, 15));

  it('puts the first day of Fall in Fall (the boundary bug)', () => {
    expect(isDateInSeason('2026-09-06', fall2026)).toBe(true);
    expect(isDateInSeason('2026-09-06', summer2026)).toBe(false);
  });

  it('puts the last day of Summer in Summer', () => {
    expect(isDateInSeason('2026-09-05', summer2026)).toBe(true);
    expect(isDateInSeason('2026-09-05', fall2026)).toBe(false);
  });

  it('covers the last day of Fall and excludes the first day of Winter', () => {
    expect(isDateInSeason('2026-11-15', fall2026)).toBe(true);
    expect(isDateInSeason('2026-11-16', fall2026)).toBe(false);
  });

  it('excludes dates from other seasons entirely', () => {
    expect(isDateInSeason('2026-07-04', fall2026)).toBe(false);
  });
});

describe('getSeasonLabel', () => {
  it('labels a boundary date with the season it actually starts', () => {
    expect(getSeasonLabel('2026-09-06')).toBe('Fall 2026');
    expect(getSeasonLabel('2026-09-05')).toBe('Summer 2026');
  });

  it('labels mid-season dates', () => {
    expect(getSeasonLabel('2026-03-08')).toBe('Spring 2026');
    expect(getSeasonLabel('2026-10-01')).toBe('Fall 2026');
  });

  it('carries winter across the year boundary', () => {
    // Winter starts Nov 16 and runs to Mar 7, so January belongs to the
    // season that opened the previous November.
    expect(getSeasonLabel('2026-11-16')).toBe('Winter 2026-27');
    expect(getSeasonLabel('2027-01-15')).toBe('Winter 2026-27');
  });
});
