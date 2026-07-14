-- Enable Supabase Realtime for the tables that drive the admin live-update UX
-- (notification bell, Parents link requests, Attendance RSVPs). Adding a table
-- to the supabase_realtime publication is what makes postgres_changes events
-- flow to subscribed clients; RLS on each table still governs delivery.
--
-- Idempotent: re-running is a no-op, and it won't error if a table is already
-- published (e.g. added via the Supabase dashboard).
do $$
declare
  t text;
begin
  foreach t in array array['admin_notifications', 'parent_children', 'event_attendance']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
