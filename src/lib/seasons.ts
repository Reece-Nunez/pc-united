export interface Season {
  label: string;   // e.g. "Spring 2026"
  key: string;     // e.g. "spring-2026"
  startDate: Date;
  endDate: Date;
}

// Season boundaries (start dates, each runs until the next starts):
// Spring: Mar 8 – May 23
// Summer: May 24 – Sep 5
// Fall:   Sep 6 – Nov 15
// Winter: Nov 16 – Mar 7

type SeasonType = 'spring' | 'summer' | 'fall' | 'winter';

const SEASON_ORDER: SeasonType[] = ['spring', 'summer', 'fall', 'winter'];

// Month/day pairs for when each season starts (month is 0-indexed)
const SEASON_START: Record<SeasonType, { month: number; day: number }> = {
  spring: { month: 2, day: 8 },   // Mar 8
  summer: { month: 4, day: 24 },  // May 24
  fall:   { month: 8, day: 6 },   // Sep 6
  winter: { month: 10, day: 16 }, // Nov 16
};

function toMonthDay(date: Date): number {
  return date.getMonth() * 100 + date.getDate();
}

function getSeasonType(date: Date): SeasonType {
  const md = toMonthDay(date);
  // Walk backwards through season starts to find which season we're in
  if (md >= toMonthDay(new Date(2000, SEASON_START.winter.month, SEASON_START.winter.day))) return 'winter';
  if (md >= toMonthDay(new Date(2000, SEASON_START.fall.month, SEASON_START.fall.day))) return 'fall';
  if (md >= toMonthDay(new Date(2000, SEASON_START.summer.month, SEASON_START.summer.day))) return 'summer';
  if (md >= toMonthDay(new Date(2000, SEASON_START.spring.month, SEASON_START.spring.day))) return 'spring';
  // Jan 1 – Mar 6 is still winter from the previous year's start
  return 'winter';
}

function buildSeason(type: SeasonType, year: number): Season {
  const start = SEASON_START[type];
  const startDate = new Date(year, start.month, start.day);

  // End date is the day before the next season starts
  const nextIndex = (SEASON_ORDER.indexOf(type) + 1) % 4;
  const nextType = SEASON_ORDER[nextIndex];
  const nextStart = SEASON_START[nextType];
  let endYear = year;
  if (nextType === 'spring') endYear = year + 1; // winter crosses year boundary
  const endDate = new Date(endYear, nextStart.month, nextStart.day - 1, 23, 59, 59);

  let label: string;
  let key: string;

  if (type === 'winter') {
    label = `Winter ${year}-${(year + 1).toString().slice(2)}`;
    key = `winter-${year}`;
  } else {
    label = `${type.charAt(0).toUpperCase() + type.slice(1)} ${year}`;
    key = `${type}-${year}`;
  }

  return { label, key, startDate, endDate };
}

export function getCurrentSeason(): Season {
  return getSeasonForDate(new Date());
}

export function getSeasonForDate(date: Date): Season {
  const type = getSeasonType(date);
  const year = date.getFullYear();

  // If it's winter and we're in Jan–Mar, the season started in the previous year
  if (type === 'winter' && date.getMonth() < SEASON_START.winter.month) {
    return buildSeason('winter', year - 1);
  }

  return buildSeason(type, year);
}

export function getSeasonLabel(dateStr: string): string {
  return getSeasonForDate(new Date(dateStr)).label;
}

/** Returns a list of recent seasons for dropdown selection, most recent first. */
export function getAvailableSeasons(count = 8): Season[] {
  const seasons: Season[] = [];
  const current = getCurrentSeason();
  seasons.push(current);

  let type = getSeasonType(new Date());
  let year = new Date().getFullYear();
  if (type === 'winter' && new Date().getMonth() < SEASON_START.winter.month) year -= 1;

  for (let i = 1; i < count; i++) {
    const idx = SEASON_ORDER.indexOf(type);
    if (idx === 0) {
      // spring -> go back to winter of previous year
      type = 'winter';
      year -= 1;
    } else {
      type = SEASON_ORDER[idx - 1];
    }
    seasons.push(buildSeason(type, year));
  }

  return seasons;
}

export function isDateInSeason(dateStr: string, season: Season): boolean {
  const date = new Date(dateStr);
  return date >= season.startDate && date <= season.endDate;
}
