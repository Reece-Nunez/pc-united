-- Broaden Supabase Realtime so admin screens and the public site update live
-- instead of needing a manual refresh. Adding a table to the supabase_realtime
-- publication is what makes postgres_changes events flow to subscribed clients.
--
-- SECURITY: realtime delivery is still governed by each table's RLS. The tables
-- below are already anon-readable via the REST API (open `select using (true)`
-- policies — the project's known open-RLS/PII debt), so publishing them to
-- realtime rides the *same* existing gate rather than opening a new one. The
-- proper fix for the sensitive ones (players, dues_*, expenses, income,
-- newsletter_subscribers) is to harden RLS, which closes both the REST and the
-- realtime exposure at once. See the open-RLS PII debt note.
--
-- DELIBERATELY EXCLUDED: medical_forms and registrations. Both already have
-- hardened, default-deny RLS (read only via service-role admin routes), so anon
-- realtime would deliver nothing anyway — and they are the crown-jewel PII.
--
-- Idempotent and defensive: skips tables that don't exist and tables already in
-- the publication, so re-running (or running against a partial schema) is safe.
do $$
declare
  t text;
begin
  foreach t in array array[
    'teams', 'players', 'events', 'schedule', 'news', 'announcements',
    'highlights', 'gallery_images', 'gallery_image_tags', 'game_stats',
    'player_stats', 'opponents', 'coaches', 'sponsorships',
    'newsletter_subscribers', 'dues_fees', 'dues_payments', 'expenses',
    'income', 'site_settings', 'audit_log', 'parent_players'
  ]
  loop
    -- Skip if the table doesn't exist in this environment.
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    -- Skip if already published (e.g. added via the dashboard).
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
