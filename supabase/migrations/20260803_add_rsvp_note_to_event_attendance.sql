-- Parent-supplied reason for an RSVP (e.g. why a player will be absent).
-- Kept separate from `note` (the coach's attendance note) so parent intent and
-- coach record never clobber each other — same principle as rsvp vs attendance.
alter table public.event_attendance
  add column if not exists rsvp_note text;
