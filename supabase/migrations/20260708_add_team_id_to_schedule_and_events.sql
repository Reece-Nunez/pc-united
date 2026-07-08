-- Scope games and events to a team (U11/U12) so attendance/stats auto-filter.
-- Nullable: null = applies to the whole club / not team-specific.
alter table public.schedule add column if not exists team_id integer references public.teams(id) on delete set null;
alter table public.events   add column if not exists team_id integer references public.teams(id) on delete set null;
create index if not exists schedule_team_id_idx on public.schedule (team_id);
create index if not exists events_team_id_idx on public.events (team_id);
