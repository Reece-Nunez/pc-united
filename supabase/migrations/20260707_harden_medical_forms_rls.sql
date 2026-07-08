-- Harden RLS on public.medical_forms.
--
-- The original migration opened every operation with `using (true)`, matching the
-- app's expenses/income/players convention. But medical_forms holds sensitive PII
-- (date of birth, allergies, medical conditions, insurance policy/group numbers,
-- emergency phone numbers). Because the site reads through the public
-- NEXT_PUBLIC_SUPABASE_ANON_KEY, anyone holding that key could `select *` and read
-- every family's medical data.
--
-- New model:
--   * anon/authenticated get NO direct table access (RLS enabled, all open policies
--     dropped -> default deny). The service role still bypasses RLS for admin CRUD.
--   * The public token path uses two SECURITY DEFINER RPCs scoped to a single row:
--       get_medical_form(token)   -> read the one row matching the unguessable token
--       submit_medical_form(...)  -> fill/complete that one row
--   * Admin reads/writes move behind an authenticated API route that uses the
--     service-role key (see src/app/api/admin/medical-forms/route.ts).

-- 1. Drop the fully-open policies. With RLS still enabled and no policies present,
--    anon and authenticated roles are denied all direct access by default.
drop policy if exists medical_forms_read   on public.medical_forms;
drop policy if exists medical_forms_insert on public.medical_forms;
drop policy if exists medical_forms_update on public.medical_forms;
drop policy if exists medical_forms_delete on public.medical_forms;

-- 2. Public read, scoped to a single unguessable token.
--    SECURITY DEFINER so it runs as the (RLS-exempt) function owner; the WHERE on
--    token is the only thing a caller can influence, so they can never enumerate
--    other rows. Returns the row merged with the joined player summary the fill
--    page expects (form.players?.name), or NULL when the token is unknown.
create or replace function public.get_medical_form(p_token text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(mf) || jsonb_build_object(
    'players',
    case
      when p.id is null then null
      else jsonb_build_object('id', p.id, 'name', p.name, 'jersey_number', p.jersey_number)
    end
  )
  from public.medical_forms mf
  left join public.players p on p.id = mf.player_id
  where mf.token = p_token;
$$;

-- 3. Public submit, scoped to a single token.
--    Only the parent-fillable columns are sourced from p_fields; server-managed
--    columns (id, token, player_id, status, created_by, created_at, ...) are never
--    read from the caller payload, so a crafted payload cannot tamper with them.
--    coalesce(...) keeps the existing value when a key is absent from p_fields.
--    Returns the updated row as jsonb, or NULL when the token is unknown.
create or replace function public.submit_medical_form(p_token text, p_fields jsonb)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.medical_forms set
    player_name              = coalesce(p_fields->>'player_name', player_name),
    date_of_birth            = coalesce(nullif(p_fields->>'date_of_birth', '')::date, date_of_birth),
    gender                   = coalesce(p_fields->>'gender', gender),
    address                  = coalesce(p_fields->>'address', address),
    city                     = coalesce(p_fields->>'city', city),
    state                    = coalesce(p_fields->>'state', state),
    zip                      = coalesce(p_fields->>'zip', zip),
    father_name              = coalesce(p_fields->>'father_name', father_name),
    father_home_phone        = coalesce(p_fields->>'father_home_phone', father_home_phone),
    father_work_phone        = coalesce(p_fields->>'father_work_phone', father_work_phone),
    mother_name              = coalesce(p_fields->>'mother_name', mother_name),
    mother_home_phone        = coalesce(p_fields->>'mother_home_phone', mother_home_phone),
    mother_work_phone        = coalesce(p_fields->>'mother_work_phone', mother_work_phone),
    emergency1_name          = coalesce(p_fields->>'emergency1_name', emergency1_name),
    emergency1_home_phone    = coalesce(p_fields->>'emergency1_home_phone', emergency1_home_phone),
    emergency1_work_phone    = coalesce(p_fields->>'emergency1_work_phone', emergency1_work_phone),
    emergency2_name          = coalesce(p_fields->>'emergency2_name', emergency2_name),
    emergency2_home_phone    = coalesce(p_fields->>'emergency2_home_phone', emergency2_home_phone),
    emergency2_work_phone    = coalesce(p_fields->>'emergency2_work_phone', emergency2_work_phone),
    allergies                = coalesce(p_fields->>'allergies', allergies),
    other_conditions         = coalesce(p_fields->>'other_conditions', other_conditions),
    physician_name           = coalesce(p_fields->>'physician_name', physician_name),
    physician_home_phone     = coalesce(p_fields->>'physician_home_phone', physician_home_phone),
    physician_work_phone     = coalesce(p_fields->>'physician_work_phone', physician_work_phone),
    insurance_company        = coalesce(p_fields->>'insurance_company', insurance_company),
    insurance_phone          = coalesce(p_fields->>'insurance_phone', insurance_phone),
    policy_holder            = coalesce(p_fields->>'policy_holder', policy_holder),
    policy_number            = coalesce(p_fields->>'policy_number', policy_number),
    group_number             = coalesce(p_fields->>'group_number', group_number),
    insurance_card_front_url = coalesce(p_fields->>'insurance_card_front_url', insurance_card_front_url),
    insurance_card_back_url  = coalesce(p_fields->>'insurance_card_back_url', insurance_card_back_url),
    consent_agreed           = coalesce((p_fields->>'consent_agreed')::boolean, consent_agreed),
    signature                = coalesce(p_fields->>'signature', signature),
    signed_date              = coalesce(nullif(p_fields->>'signed_date', '')::date, signed_date),
    status                   = 'completed',
    completed_at             = now(),
    updated_at               = now()
  where token = p_token
  returning to_jsonb(medical_forms);
$$;

-- 4. Public "universal link" submit: a parent visits /forms/medical (no token),
--    picks their child, and a brand-new completed row is created. Same whitelist
--    discipline as submit_medical_form — only parent-fillable columns are read from
--    p_fields; player_id comes in as its own typed arg. The DB defaults still fill
--    id/token/created_at. This is public write-only (matching the pre-hardening open
--    INSERT and the registrations form); the PII risk being closed here is read, not
--    insert.
create or replace function public.create_medical_form_submission(p_player_id bigint, p_fields jsonb)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.medical_forms (
    player_id, status, completed_at,
    player_name, date_of_birth, gender, address, city, state, zip,
    father_name, father_home_phone, father_work_phone,
    mother_name, mother_home_phone, mother_work_phone,
    emergency1_name, emergency1_home_phone, emergency1_work_phone,
    emergency2_name, emergency2_home_phone, emergency2_work_phone,
    allergies, other_conditions,
    physician_name, physician_home_phone, physician_work_phone,
    insurance_company, insurance_phone, policy_holder, policy_number, group_number,
    insurance_card_front_url, insurance_card_back_url,
    consent_agreed, signature, signed_date
  ) values (
    p_player_id, 'completed', now(),
    p_fields->>'player_name',
    nullif(p_fields->>'date_of_birth', '')::date,
    p_fields->>'gender',
    p_fields->>'address',
    p_fields->>'city',
    p_fields->>'state',
    p_fields->>'zip',
    p_fields->>'father_name',
    p_fields->>'father_home_phone',
    p_fields->>'father_work_phone',
    p_fields->>'mother_name',
    p_fields->>'mother_home_phone',
    p_fields->>'mother_work_phone',
    p_fields->>'emergency1_name',
    p_fields->>'emergency1_home_phone',
    p_fields->>'emergency1_work_phone',
    p_fields->>'emergency2_name',
    p_fields->>'emergency2_home_phone',
    p_fields->>'emergency2_work_phone',
    p_fields->>'allergies',
    p_fields->>'other_conditions',
    p_fields->>'physician_name',
    p_fields->>'physician_home_phone',
    p_fields->>'physician_work_phone',
    p_fields->>'insurance_company',
    p_fields->>'insurance_phone',
    p_fields->>'policy_holder',
    p_fields->>'policy_number',
    p_fields->>'group_number',
    p_fields->>'insurance_card_front_url',
    p_fields->>'insurance_card_back_url',
    (p_fields->>'consent_agreed')::boolean,
    p_fields->>'signature',
    nullif(p_fields->>'signed_date', '')::date
  )
  returning to_jsonb(medical_forms);
$$;

-- 5. Only the public roles need to call these; nothing else should. Revoke the
--    implicit PUBLIC execute grant, then grant to the two Supabase client roles.
revoke all on function public.get_medical_form(text)                        from public;
revoke all on function public.submit_medical_form(text, jsonb)              from public;
revoke all on function public.create_medical_form_submission(bigint, jsonb) from public;
grant execute on function public.get_medical_form(text)                        to anon, authenticated;
grant execute on function public.submit_medical_form(text, jsonb)              to anon, authenticated;
grant execute on function public.create_medical_form_submission(bigint, jsonb) to anon, authenticated;
