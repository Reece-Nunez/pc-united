-- Add a "time is TBD" flag to events and games.
--
-- event_date / game_date are NOT NULL timestamps, so a date-with-unknown-time
-- can't be represented by the timestamp alone (a date-only value coerces to
-- midnight, indistinguishable from a real midnight event). This boolean lets
-- the admin enter only the date and have the UI render "TBD" for the time,
-- while the stored timestamp is pinned to midnight of that day.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS time_tbd BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE schedule
  ADD COLUMN IF NOT EXISTS time_tbd BOOLEAN NOT NULL DEFAULT FALSE;
