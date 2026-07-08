-- Attendance/RSVP now covers games (schedule) AND events/practices (events).
-- A row points at exactly one of them. NULLS NOT DISTINCT (PG15+) lets a single
-- composite unique key serve both kinds and be a clean upsert target.
alter table public.event_attendance
  add column if not exists schedule_id bigint references public.schedule(id) on delete cascade;

alter table public.event_attendance drop constraint if exists event_attendance_event_id_player_id_key;
alter table public.event_attendance
  add constraint event_attendance_session_player_uniq
  unique nulls not distinct (event_id, schedule_id, player_id);

create index if not exists event_attendance_schedule_idx on public.event_attendance (schedule_id);
