-- Harden RLS on public.registrations.
--
-- This table holds PII: parent name/email/phone/address, emergency contact, and
-- medical_conditions/allergies/medications. It was created outside the migrations
-- tree (see SETUP.md) with the app's usual fully-open convention, so the public
-- NEXT_PUBLIC anon key could `select *` and read every registrant's record.
--
-- Fix: keep public INSERT (the registration form at /register submits via the anon
-- key) but remove every read/update/delete path for anon + authenticated roles.
-- Admin reads now go through the service-role route at
-- src/app/api/admin/registrations/route.ts, which bypasses RLS and is gated by an
-- authenticated admin check. The service role is unaffected by these policies.

alter table public.registrations enable row level security;

-- Drop whatever policies exist today. The table was hand-created, so the policy
-- names aren't known here — iterate the catalog instead of guessing names. This
-- clears any open `using (true)` SELECT / FOR ALL policy that leaked PII.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'registrations'
  loop
    execute format('drop policy if exists %I on public.registrations', pol.policyname);
  end loop;
end $$;

-- Only allow inserts (the public registration form). No SELECT/UPDATE/DELETE
-- policy exists, so with RLS on, anon + authenticated get nothing back.
create policy registrations_insert on public.registrations
  for insert with check (true);
