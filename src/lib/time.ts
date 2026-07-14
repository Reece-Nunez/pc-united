// The club is in Ponca City, Oklahoma (US Central time). Event/practice dates
// are entered via <input type="datetime-local"> and stored as the naive
// wall-clock string the admin typed (e.g. "2026-07-14T18:30"), which Postgres
// records as 18:30+00. That means anything comparing these values to "now"
// must use the same Central wall-clock frame — not a real UTC instant, which
// runs ~5–6 hours ahead and would drop events that are still later *today*.
export const CLUB_TIME_ZONE = 'America/Chicago';

/**
 * Start of "today" in the club's timezone, as a naive timestamp string
 * (`YYYY-MM-DDT00:00:00`) suitable for a Supabase `.gte('event_date', …)`
 * filter.
 *
 * Using start-of-day (rather than the current instant) keeps an event visible
 * for its whole day — matching how the attendance page keeps a session "open"
 * until the day passes — so a 6:30 PM practice created that afternoon still
 * shows up on the RSVP and "upcoming" lists.
 */
export function clubStartOfTodayISO(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, evaluated in the club's timezone.
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return `${ymd}T00:00:00`;
}

/**
 * Whether a stored event/game timestamp is today (club time) or later — the
 * client-side counterpart to the `getEvents` server filter, for game_date
 * values that are filtered in the browser.
 *
 * A plain string comparison is correct here: both sides are ISO-8601 sharing
 * the `YYYY-MM-DDTHH:MM:SS` ordering prefix, and the cutoff sits at T00:00:00,
 * so any timestamp on the same club day sorts at or after it — regardless of
 * the timezone suffix Supabase appends. This keeps an evening game visible for
 * its whole day instead of disappearing once the real UTC clock passes it.
 */
export function isClubTodayOrLater(dateStr: string, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  return dateStr >= clubStartOfTodayISO(now);
}
