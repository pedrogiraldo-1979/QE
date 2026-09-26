-- QE2026 structural replay for an empty, isolated Supabase project only.
-- NOT a production migration. Never run against QE2026 or a database containing CRM rows.
-- No Auth users, memberships, campaign contacts, business rows, or historical backfills.

-- Source: 20260720000000_initial_crm_baseline.sql
-- Reproducible CRM schema baseline for empty Supabase projects.
-- This migration contains schema and permissions only: no Auth users, memberships, or business rows.
-- It is intentionally safe to replay over an existing project: tables and indexes are guarded,
-- functions are replaced with the current contract, and existing RLS policies are not dropped.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  legal_name text,
  nit text,
  segment text,
  city text,
  website text,
  phone text,
  address text,
  status text default 'nuevo',
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies (id) on delete cascade,
  company_name text,
  full_name text,
  role text,
  email text,
  phone text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  contact_type text default 'comercial_principal',
  priority integer default 1,
  mobile_phone text,
  office_phone text,
  is_primary boolean default true,
  source text default 'base_inicial',
  confidence text
);

create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  activity_type text default 'note' not null,
  notes text,
  activity_date date default current_date,
  due_date date,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.cu_links (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  token text default encode(gen_random_bytes(24), 'hex') not null unique,
  email_to text,
  is_active boolean default true not null,
  expires_at timestamp with time zone,
  responded_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.cu_responses (
  id uuid default gen_random_uuid() primary key,
  link_id uuid not null references public.cu_links (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  token text not null,
  confirm_no_changes boolean default false not null,
  razon_social_nueva text,
  nit_nuevo text,
  contacto_comercial_nuevo text,
  cargo_contacto_nuevo text,
  celular_comercial_nuevo text,
  correo_comercial_nuevo text,
  contacto_pagos_nuevo text,
  cargo_pagos_nuevo text,
  telefono_tesoreria_nuevo text,
  correo_tesoreria_nuevo text,
  correo_facturacion_nuevo text,
  direccion_nueva text,
  observaciones_cliente text,
  status text default 'pendiente' not null,
  created_at timestamp with time zone default now() not null,
  payload jsonb
);

create table if not exists public.prospect_lists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  segment text,
  source text,
  city text,
  status text default 'activa' not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.prospects (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references public.prospect_lists (id) on delete set null,
  company_name text not null,
  legal_name text,
  nit text,
  segment text,
  city text,
  website text,
  phone text,
  address text,
  status text default 'nuevo' not null,
  priority text default 'media' not null,
  source text,
  confidence_score integer,
  notes text,
  converted_company_id uuid references public.companies (id) on delete set null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.prospect_contacts (
  id uuid default gen_random_uuid() primary key,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  full_name text,
  role text,
  email text,
  phone text,
  linkedin_url text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.prospect_activities (
  id uuid default gen_random_uuid() primary key,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  contact_id uuid references public.prospect_contacts (id) on delete set null,
  activity_type text default 'follow_up' not null,
  notes text,
  activity_date date default current_date,
  due_date date,
  completed boolean default false not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists private.crm_authorized_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text default 'member' not null check (role in ('admin', 'member')),
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists companies_name_idx on public.companies (name);
create index if not exists companies_nit_idx on public.companies (nit);
create index if not exists companies_segment_idx on public.companies (segment);
create index if not exists companies_status_idx on public.companies (status);
create index if not exists contacts_company_id_idx on public.contacts (company_id);
create index if not exists contacts_company_name_idx on public.contacts (company_name);
create index if not exists activities_company_id_idx on public.activities (company_id);
create index if not exists activities_contact_id_idx on public.activities (contact_id);
create index if not exists activities_due_date_idx on public.activities (due_date);
create index if not exists cu_links_company_id_idx on public.cu_links (company_id);
create index if not exists cu_responses_company_id_idx on public.cu_responses (company_id);
create index if not exists cu_responses_link_id_idx on public.cu_responses (link_id);
create index if not exists prospects_list_id_idx on public.prospects (list_id);
create index if not exists prospects_converted_company_id_idx on public.prospects (converted_company_id);
create index if not exists prospect_contacts_prospect_id_idx on public.prospect_contacts (prospect_id);
create index if not exists prospect_activities_prospect_id_idx on public.prospect_activities (prospect_id);
create index if not exists prospect_activities_contact_id_idx on public.prospect_activities (contact_id);

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.activities enable row level security;
alter table public.cu_links enable row level security;
alter table public.cu_responses enable row level security;
alter table public.prospect_lists enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_contacts enable row level security;
alter table public.prospect_activities enable row level security;
alter table private.crm_authorized_users enable row level security;

create or replace function private.is_crm_authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and exists (
      select 1
      from private.crm_authorized_users member
      where member.user_id = (select auth.uid())
        and member.active = true
    );
$function$;

create or replace function public.is_crm_authorized()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_crm_authorized();
$function$;

create or replace function public.get_cu_form(p_token text)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'cliente_id', c.id,
    'nombre_cliente', c.name,
    'razon_social', c.legal_name,
    'nit', c.nit,
    'contacto_actual', coalesce(ct.full_name, ''),
    'telefono_actual', coalesce(ct.phone, c.phone, ''),
    'correo_actual', coalesce(ct.email, ''),
    'direccion_actual', coalesce(c.address, ''),
    'segmento', coalesce(c.segment, '')
  )
  from public.cu_links l
  join public.companies c on c.id = l.company_id
  left join lateral (
    select full_name, phone, email
    from public.contacts
    where company_id = c.id
    limit 1
  ) ct on true
  where l.token = p_token
    and l.is_active = true
    and (l.expires_at is null or l.expires_at > now())
  limit 1;
$function$;

create or replace function public.submit_cu_form(p_token text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_response_id uuid;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  if octet_length(p_payload::text) > 32768 then
    raise exception 'Payload exceeds 32 KB' using errcode = '22001';
  end if;

  insert into public.cu_responses (link_id, company_id, token, payload)
  select id, company_id, p_token, p_payload
  from public.cu_links
  where token = p_token
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1
  returning id into v_response_id;

  return v_response_id;
end;
$function$;

create or replace function public.get_cu_pending_reviews()
returns table (
  response_id uuid,
  company_id uuid,
  created_at timestamp with time zone,
  status text,
  cliente text,
  razon_social_actual text,
  nit_actual text,
  telefono_actual text,
  correo_actual text,
  direccion_actual text,
  payload jsonb
)
language sql
security invoker
set search_path = ''
as $function$
  select
    r.id,
    r.company_id,
    r.created_at,
    r.status,
    c.name,
    c.legal_name,
    c.nit,
    coalesce(ct.phone, c.phone, ''),
    coalesce(ct.email, ''),
    coalesce(c.address, ''),
    r.payload
  from public.cu_responses r
  join public.companies c on c.id = r.company_id
  left join lateral (
    select phone, email
    from public.contacts
    where company_id = c.id
    order by created_at asc nulls last
    limit 1
  ) ct on true
  where r.status = 'pendiente'
  order by r.created_at desc;
$function$;

create or replace function public.approve_cu_response(p_response_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_company_id uuid;
  v_payload jsonb;
begin
  select company_id, payload into v_company_id, v_payload
  from public.cu_responses
  where id = p_response_id and status = 'pendiente'
  limit 1;

  if v_company_id is null then
    return;
  end if;

  update public.companies
  set
    legal_name = coalesce(nullif(v_payload->>'razon_social_nueva', ''), legal_name),
    nit = coalesce(nullif(v_payload->>'nit_nuevo', ''), nit),
    address = coalesce(nullif(v_payload->>'direccion_nueva', ''), address),
    updated_at = now()
  where id = v_company_id;

  update public.contacts
  set
    full_name = coalesce(nullif(v_payload->>'contacto_comercial_nuevo', ''), full_name),
    role = coalesce(nullif(v_payload->>'cargo_contacto_nuevo', ''), role),
    phone = coalesce(nullif(v_payload->>'celular_comercial_nuevo', ''), phone),
    email = coalesce(nullif(v_payload->>'correo_comercial_nuevo', ''), email),
    updated_at = now()
  where id = (
    select id from public.contacts
    where company_id = v_company_id
    order by created_at asc nulls last
    limit 1
  );

  update public.cu_responses
  set status = 'aprobado'
  where id = p_response_id;
end;
$function$;

create or replace function public.reject_cu_response(p_response_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $function$
  update public.cu_responses
  set status = 'rechazado'
  where id = p_response_id
    and status = 'pendiente';
$function$;

create or replace function public.convert_prospect_to_company(
  p_prospect_id uuid,
  p_notes text default null
)
returns public.companies
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_prospect public.prospects%rowtype;
  v_company public.companies%rowtype;
begin
  select *
  into v_prospect
  from public.prospects
  where id = p_prospect_id
  for update;

  if not found then
    raise exception 'Prospect not found' using errcode = 'P0002';
  end if;

  if v_prospect.converted_company_id is not null then
    select *
    into v_company
    from public.companies
    where id = v_prospect.converted_company_id;

    if not found then
      raise exception 'Converted prospect references a missing company' using errcode = '23503';
    end if;

    return v_company;
  end if;

  insert into public.companies (
    name,
    legal_name,
    nit,
    segment,
    city,
    website,
    phone,
    address,
    status,
    notes
  )
  values (
    v_prospect.company_name,
    v_prospect.legal_name,
    v_prospect.nit,
    v_prospect.segment,
    v_prospect.city,
    v_prospect.website,
    v_prospect.phone,
    v_prospect.address,
    'cliente',
    coalesce(nullif(btrim(p_notes), ''), 'Convertido desde prospeccion.')
  )
  returning * into v_company;

  update public.prospects
  set
    status = 'convertido_cliente',
    converted_company_id = v_company.id,
    updated_at = now()
  where id = v_prospect.id;

  return v_company;
end;
$function$;

create or replace function public.delete_prospect(p_prospect_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_deleted_id uuid;
begin
  delete from public.prospects
  where id = p_prospect_id
  returning id into v_deleted_id;

  return v_deleted_id is not null;
end;
$function$;

revoke all privileges on table
  public.companies,
  public.contacts,
  public.activities,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
from anon, authenticated;

grant select, insert, update, delete on table
  public.companies,
  public.contacts,
  public.activities,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
to authenticated;

revoke all privileges on table private.crm_authorized_users from public, anon, authenticated;

revoke execute on function private.is_crm_authorized() from public, anon, authenticated;
grant execute on function private.is_crm_authorized() to authenticated;

revoke execute on function public.is_crm_authorized() from public, anon, authenticated;
grant execute on function public.is_crm_authorized() to authenticated;

revoke execute on function public.get_cu_form(text) from public, anon, authenticated;
grant execute on function public.get_cu_form(text) to anon, authenticated;

revoke execute on function public.submit_cu_form(text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_cu_form(text, jsonb) to anon, authenticated;

revoke execute on function public.get_cu_pending_reviews() from public, anon, authenticated;
grant execute on function public.get_cu_pending_reviews() to authenticated;

revoke execute on function public.approve_cu_response(uuid) from public, anon, authenticated;
grant execute on function public.approve_cu_response(uuid) to authenticated;

revoke execute on function public.reject_cu_response(uuid) from public, anon, authenticated;
grant execute on function public.reject_cu_response(uuid) to authenticated;

revoke execute on function public.convert_prospect_to_company(uuid, text) from public, anon, authenticated;
grant execute on function public.convert_prospect_to_company(uuid, text) to authenticated;

revoke execute on function public.delete_prospect(uuid) from public, anon, authenticated;
grant execute on function public.delete_prospect(uuid) to authenticated;

-- Source: 20260720001733_phase_2_stabilization.sql
-- Phase 2: least-privilege RPC grants, atomic prospect operations, and FK indexes.
-- This migration intentionally does not rewrite existing data or change RLS policies.

-- Public customer-update endpoints remain callable with a valid link token.
revoke execute on function public.get_cu_form(text) from public, anon, authenticated;
grant execute on function public.get_cu_form(text) to anon, authenticated;

revoke execute on function public.submit_cu_form(text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_cu_form(text, jsonb) to anon, authenticated;

-- Internal review endpoints must respect the caller's RLS context and require login.
alter function public.get_cu_pending_reviews() security invoker;
revoke execute on function public.get_cu_pending_reviews() from public, anon, authenticated;
grant execute on function public.get_cu_pending_reviews() to authenticated;

alter function public.approve_cu_response(uuid) security invoker;
revoke execute on function public.approve_cu_response(uuid) from public, anon, authenticated;
grant execute on function public.approve_cu_response(uuid) to authenticated;

alter function public.reject_cu_response(uuid) security invoker;
revoke execute on function public.reject_cu_response(uuid) from public, anon, authenticated;
grant execute on function public.reject_cu_response(uuid) to authenticated;

create or replace function public.convert_prospect_to_company(
  p_prospect_id uuid,
  p_notes text default null
)
returns public.companies
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_prospect public.prospects%rowtype;
  v_company public.companies%rowtype;
begin
  select *
  into v_prospect
  from public.prospects
  where id = p_prospect_id
  for update;

  if not found then
    raise exception 'Prospect not found' using errcode = 'P0002';
  end if;

  if v_prospect.converted_company_id is not null then
    select *
    into v_company
    from public.companies
    where id = v_prospect.converted_company_id;

    if not found then
      raise exception 'Converted prospect references a missing company' using errcode = '23503';
    end if;

    return v_company;
  end if;

  insert into public.companies (
    name,
    legal_name,
    nit,
    segment,
    city,
    website,
    phone,
    address,
    status,
    notes
  )
  values (
    v_prospect.company_name,
    v_prospect.legal_name,
    v_prospect.nit,
    v_prospect.segment,
    v_prospect.city,
    v_prospect.website,
    v_prospect.phone,
    v_prospect.address,
    'cliente',
    coalesce(nullif(btrim(p_notes), ''), 'Convertido desde prospeccion.')
  )
  returning * into v_company;

  update public.prospects
  set
    status = 'convertido_cliente',
    converted_company_id = v_company.id,
    updated_at = now()
  where id = v_prospect.id;

  return v_company;
end;
$function$;

revoke execute on function public.convert_prospect_to_company(uuid, text) from public, anon, authenticated;
grant execute on function public.convert_prospect_to_company(uuid, text) to authenticated;

create or replace function public.delete_prospect(p_prospect_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_deleted_id uuid;
begin
  delete from public.prospects
  where id = p_prospect_id
  returning id into v_deleted_id;

  return v_deleted_id is not null;
end;
$function$;

revoke execute on function public.delete_prospect(uuid) from public, anon, authenticated;
grant execute on function public.delete_prospect(uuid) to authenticated;

create index if not exists activities_contact_id_idx
  on public.activities (contact_id);
create index if not exists cu_links_company_id_idx
  on public.cu_links (company_id);
create index if not exists cu_responses_company_id_idx
  on public.cu_responses (company_id);
create index if not exists cu_responses_link_id_idx
  on public.cu_responses (link_id);
create index if not exists prospect_activities_contact_id_idx
  on public.prospect_activities (contact_id);
create index if not exists prospect_activities_prospect_id_idx
  on public.prospect_activities (prospect_id);
create index if not exists prospect_contacts_prospect_id_idx
  on public.prospect_contacts (prospect_id);
create index if not exists prospects_converted_company_id_idx
  on public.prospects (converted_company_id);
create index if not exists prospects_list_id_idx
  on public.prospects (list_id);

-- Source: 20260720002112_public_form_guardrails.sql
-- Phase 2: align public form submission with token expiry and bound its payload.
-- Existing customer-update rows are not modified.

alter function public.get_cu_form(text) set search_path = '';
alter function public.get_cu_pending_reviews() set search_path = '';
alter function public.approve_cu_response(uuid) set search_path = '';
alter function public.reject_cu_response(uuid) set search_path = '';

create or replace function public.submit_cu_form(p_token text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_response_id uuid;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  if octet_length(p_payload::text) > 32768 then
    raise exception 'Payload exceeds 32 KB' using errcode = '22001';
  end if;

  insert into public.cu_responses (link_id, company_id, token, payload)
  select id, company_id, p_token, p_payload
  from public.cu_links
  where token = p_token
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1
  returning id into v_response_id;

  return v_response_id;
end;
$function$;

revoke execute on function public.submit_cu_form(text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_cu_form(text, jsonb) to anon, authenticated;

-- Source: 20260720012043_crm_authorization_allowlist.sql
-- Restrict CRM data access to an explicit private allowlist.
-- Roles are recorded for future RBAC; both current roles retain the existing CRM CRUD behavior.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists private.crm_authorized_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table private.crm_authorized_users enable row level security;
revoke all on table private.crm_authorized_users from public, anon, authenticated;

-- Memberships are environment-specific data and must be provisioned separately.

create or replace function private.is_crm_authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and exists (
      select 1
      from private.crm_authorized_users member
      where member.user_id = (select auth.uid())
        and member.active = true
    );
$function$;

revoke execute on function private.is_crm_authorized() from public, anon, authenticated;
grant execute on function private.is_crm_authorized() to authenticated;

drop policy if exists "Authenticated users can manage activities" on public.activities;
drop policy if exists "Authenticated users can manage companies" on public.companies;
drop policy if exists "Authenticated users can manage contacts" on public.contacts;
drop policy if exists authenticated_manage_cu_links on public.cu_links;
drop policy if exists authenticated_manage_cu_responses on public.cu_responses;
drop policy if exists prospect_lists_auth on public.prospect_lists;
drop policy if exists prospects_auth on public.prospects;
drop policy if exists prospect_contacts_auth on public.prospect_contacts;
drop policy if exists prospect_activities_auth on public.prospect_activities;

create policy crm_allowlist_all on public.activities
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.companies
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.contacts
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.cu_links
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.cu_responses
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.prospect_lists
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.prospects
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.prospect_contacts
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

create policy crm_allowlist_all on public.prospect_activities
  for all to authenticated
  using ((select private.is_crm_authorized()))
  with check ((select private.is_crm_authorized()));

revoke all privileges on table
  public.activities,
  public.companies,
  public.contacts,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
from anon, authenticated;

grant select, insert, update, delete on table
  public.activities,
  public.companies,
  public.contacts,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
to authenticated;

-- Source: 20260720012701_crm_authorization_check.sql
-- Expose only the current session's CRM authorization result to the frontend.

create or replace function public.is_crm_authorized()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_crm_authorized();
$function$;

revoke execute on function public.is_crm_authorized() from public, anon, authenticated;
grant execute on function public.is_crm_authorized() to authenticated;

-- Source: 20260720031715_guard_customer_response_transitions.sql
-- Customer-update decisions are terminal: only pending responses may be rejected.
create or replace function public.reject_cu_response(p_response_id uuid)
returns void
language sql
set search_path = ''
as $function$
  update public.cu_responses
  set status = 'rechazado'
  where id = p_response_id
    and status = 'pendiente';
$function$;

revoke execute on function public.reject_cu_response(uuid) from public, anon, authenticated;
grant execute on function public.reject_cu_response(uuid) to authenticated;

-- Source: 20260721023246_add_approved_campaign_pilot.sql
-- Closed, five-recipient pilot for the customer-data update campaign.
-- Environment-specific recipients are provisioned after deployment and are never committed.

create table public.campaign_pilot_recipients (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null unique references public.cu_links (id) on delete restrict,
  sequence smallint not null unique check (sequence between 1 and 5),
  recipient_name text not null check (length(btrim(recipient_name)) between 1 and 160),
  recipient_email text not null check (
    recipient_email = lower(btrim(recipient_email))
    and recipient_email ~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$'
  ),
  status text not null default 'approved'
    check (status in ('approved', 'sending', 'sent', 'failed')),
  claimed_at timestamp with time zone,
  sent_at timestamp with time zone,
  sent_by uuid references auth.users (id) on delete set null,
  provider_status integer,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index campaign_pilot_recipients_sent_by_idx
on public.campaign_pilot_recipients (sent_by);

alter table public.campaign_pilot_recipients enable row level security;

revoke all privileges on table public.campaign_pilot_recipients
from public, anon, authenticated;

grant select, insert, update on table public.campaign_pilot_recipients
to service_role;

create or replace function public.claim_campaign_pilot_batch(p_sent_by uuid)
returns setof public.campaign_pilot_recipients
language plpgsql
security definer
set search_path = ''
as $function$
declare
  total_count integer;
  approved_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('quindio-exquisito-campaign-pilot'));

  select
    count(*)::integer,
    count(*) filter (where recipient.status = 'approved')::integer
  into total_count, approved_count
  from public.campaign_pilot_recipients recipient;

  if total_count <> 5 or approved_count <> 5 then
    raise exception 'campaign pilot batch is not exactly five approved recipients';
  end if;

  if exists (
    select 1
    from public.campaign_pilot_recipients recipient
    join public.cu_links link on link.id = recipient.link_id
    where link.is_active is not true
      or link.responded_at is not null
      or (link.expires_at is not null and link.expires_at <= now())
      or lower(btrim(coalesce(link.email_to, ''))) <> recipient.recipient_email
  ) then
    raise exception 'campaign pilot recipient validation failed';
  end if;

  update public.campaign_pilot_recipients
  set
    status = 'sending',
    claimed_at = now(),
    sent_by = p_sent_by,
    updated_at = now()
  where status = 'approved';

  return query
  select recipient.*
  from public.campaign_pilot_recipients recipient
  order by recipient.sequence;
end;
$function$;

revoke execute on function public.claim_campaign_pilot_batch(uuid)
from public, anon, authenticated;

grant execute on function public.claim_campaign_pilot_batch(uuid)
to service_role;

-- Source: 20260721170728_complete_customer_response_approval_and_master_sync.sql
-- Complete approved customer updates atomically and keep Google Sheet reconciliation explicit.
-- Existing responses remain unchanged and are not queued retroactively.

alter table public.cu_responses
  add column if not exists reviewed_at timestamp with time zone,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists master_sync_status text default 'no_requerida' not null,
  add column if not exists master_synced_at timestamp with time zone,
  add column if not exists master_synced_by uuid references auth.users (id) on delete set null,
  add column if not exists master_sync_notes text;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cu_responses_master_sync_status_check'
      and conrelid = 'public.cu_responses'::regclass
  ) then
    alter table public.cu_responses
      add constraint cu_responses_master_sync_status_check
      check (master_sync_status in ('no_requerida', 'pendiente', 'sincronizado'));
  end if;
end;
$block$;

create index if not exists cu_responses_master_sync_status_idx
  on public.cu_responses (master_sync_status, reviewed_at desc)
  where status = 'aprobado';

create index if not exists cu_responses_reviewed_by_idx
  on public.cu_responses (reviewed_by)
  where reviewed_by is not null;

create index if not exists cu_responses_master_synced_by_idx
  on public.cu_responses (master_synced_by)
  where master_synced_by is not null;

create or replace function public.get_cu_form(p_token text)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'cliente_id', c.id,
    'nombre_cliente', c.name,
    'razon_social', c.legal_name,
    'nit', c.nit,
    'contacto_actual', coalesce(ct.full_name, ''),
    'telefono_actual', coalesce(ct.mobile_phone, ct.office_phone, ct.phone, c.phone, ''),
    'correo_actual', coalesce(ct.email, ''),
    'direccion_actual', coalesce(c.address, ''),
    'segmento', coalesce(c.segment, '')
  )
  from public.cu_links l
  join public.companies c on c.id = l.company_id
  left join lateral (
    select full_name, phone, mobile_phone, office_phone, email
    from public.contacts
    where company_id = c.id
    order by
      (lower(trim(coalesce(email, ''))) = lower(trim(coalesce(l.email_to, '')))) desc,
      coalesce(is_primary, false) desc,
      priority asc nulls last,
      created_at asc nulls last,
      id asc
    limit 1
  ) ct on true
  where l.token = p_token
    and l.is_active = true
    and (l.expires_at is null or l.expires_at > now())
  limit 1;
$function$;

create or replace function public.get_cu_pending_reviews()
returns table (
  response_id uuid,
  company_id uuid,
  created_at timestamp with time zone,
  status text,
  cliente text,
  razon_social_actual text,
  nit_actual text,
  telefono_actual text,
  correo_actual text,
  direccion_actual text,
  payload jsonb
)
language sql
security invoker
set search_path = ''
as $function$
  select
    r.id,
    r.company_id,
    r.created_at,
    r.status,
    c.name,
    c.legal_name,
    c.nit,
    coalesce(ct.mobile_phone, ct.office_phone, ct.phone, c.phone, ''),
    coalesce(ct.email, ''),
    coalesce(c.address, ''),
    r.payload
  from public.cu_responses r
  join public.companies c on c.id = r.company_id
  join public.cu_links l on l.id = r.link_id
  left join lateral (
    select phone, mobile_phone, office_phone, email
    from public.contacts
    where company_id = c.id
    order by
      (lower(trim(coalesce(email, ''))) = lower(trim(coalesce(l.email_to, '')))) desc,
      coalesce(is_primary, false) desc,
      priority asc nulls last,
      created_at asc nulls last,
      id asc
    limit 1
  ) ct on true
  where r.status = 'pendiente'
  order by r.created_at desc;
$function$;

create or replace function public.approve_cu_response(p_response_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_response public.cu_responses%rowtype;
  v_company public.companies%rowtype;
  v_link_email text;
  v_primary_id uuid;
  v_primary_name text;
  v_secondary_id uuid;
  v_secondary_name text;
  v_secondary_email text;
  v_secondary_role text;
  v_secondary_type text;
  v_confirm_no_changes boolean;
begin
  select *
  into v_response
  from public.cu_responses
  where id = p_response_id
    and status = 'pendiente'
  for update;

  if not found then
    return;
  end if;

  select *
  into strict v_company
  from public.companies
  where id = v_response.company_id
  for update;

  select email_to
  into v_link_email
  from public.cu_links
  where id = v_response.link_id;

  v_secondary_name := nullif(trim(v_response.payload->>'segundo_contacto_nombre'), '');
  v_secondary_email := nullif(trim(v_response.payload->>'segundo_contacto_correo'), '');
  v_confirm_no_changes := coalesce(v_response.confirm_no_changes, false)
    or lower(coalesce(v_response.payload->>'confirm_no_changes', 'false')) = 'true';

  if not v_confirm_no_changes then
    update public.companies
    set
      legal_name = coalesce(nullif(trim(v_response.payload->>'razon_social_nueva'), ''), legal_name),
      nit = coalesce(nullif(trim(v_response.payload->>'nit_nuevo'), ''), nit),
      address = coalesce(nullif(trim(v_response.payload->>'direccion_nueva'), ''), address),
      updated_at = now()
    where id = v_response.company_id;

    select id
    into v_primary_id
    from public.contacts
    where company_id = v_response.company_id
    order by
      (lower(trim(coalesce(email, ''))) = lower(trim(coalesce(v_link_email, '')))) desc,
      coalesce(is_primary, false) desc,
      priority asc nulls last,
      created_at asc nulls last,
      id asc
    limit 1
    for update;

    if v_primary_id is null and exists (
      select 1
      where nullif(trim(v_response.payload->>'contacto_comercial_nuevo'), '') is not null
         or nullif(trim(v_response.payload->>'cargo_contacto_nuevo'), '') is not null
         or nullif(trim(v_response.payload->>'celular_comercial_nuevo'), '') is not null
         or nullif(trim(v_response.payload->>'telefono_fijo_comercial_nuevo'), '') is not null
         or nullif(trim(v_response.payload->>'correo_comercial_nuevo'), '') is not null
    ) then
      insert into public.contacts (
        company_id,
        company_name,
        full_name,
        role,
        email,
        phone,
        mobile_phone,
        office_phone,
        contact_type,
        priority,
        is_primary,
        source,
        confidence
      ) values (
        v_response.company_id,
        v_company.name,
        nullif(trim(v_response.payload->>'contacto_comercial_nuevo'), ''),
        nullif(trim(v_response.payload->>'cargo_contacto_nuevo'), ''),
        nullif(trim(v_response.payload->>'correo_comercial_nuevo'), ''),
        coalesce(
          nullif(trim(v_response.payload->>'celular_comercial_nuevo'), ''),
          nullif(trim(v_response.payload->>'telefono_fijo_comercial_nuevo'), '')
        ),
        nullif(trim(v_response.payload->>'celular_comercial_nuevo'), ''),
        nullif(trim(v_response.payload->>'telefono_fijo_comercial_nuevo'), ''),
        'comercial_principal',
        1,
        true,
        'formulario_cliente',
        'Alta'
      )
      returning id into v_primary_id;
    elsif v_primary_id is not null then
      update public.contacts
      set
        company_name = v_company.name,
        full_name = coalesce(nullif(trim(v_response.payload->>'contacto_comercial_nuevo'), ''), full_name),
        role = coalesce(nullif(trim(v_response.payload->>'cargo_contacto_nuevo'), ''), role),
        email = coalesce(nullif(trim(v_response.payload->>'correo_comercial_nuevo'), ''), email),
        phone = coalesce(
          nullif(trim(v_response.payload->>'celular_comercial_nuevo'), ''),
          nullif(trim(v_response.payload->>'telefono_fijo_comercial_nuevo'), ''),
          phone
        ),
        mobile_phone = coalesce(nullif(trim(v_response.payload->>'celular_comercial_nuevo'), ''), mobile_phone),
        office_phone = coalesce(nullif(trim(v_response.payload->>'telefono_fijo_comercial_nuevo'), ''), office_phone),
        contact_type = 'comercial_principal',
        priority = 1,
        is_primary = true,
        source = 'formulario_cliente',
        confidence = 'Alta',
        updated_at = now()
      where id = v_primary_id;
    end if;

    if v_primary_id is not null then
      update public.contacts
      set
        is_primary = false,
        priority = greatest(coalesce(priority, 2), 2),
        updated_at = now()
      where company_id = v_response.company_id
        and id <> v_primary_id
        and coalesce(is_primary, false) = true;
    end if;

    if v_primary_id is not null then
      select full_name
      into v_primary_name
      from public.contacts
      where id = v_primary_id;
    end if;

    v_secondary_role := coalesce(
      nullif(trim(v_response.payload->>'segundo_contacto_cargo'), ''),
      nullif(trim(v_response.payload->>'segundo_contacto_area'), '')
    );

    v_secondary_type := case
      when lower(coalesce(v_response.payload->>'segundo_contacto_area', '') || ' ' || coalesce(v_response.payload->>'segundo_contacto_cargo', '')) ~ 'compra' then 'compras'
      when lower(coalesce(v_response.payload->>'segundo_contacto_area', '') || ' ' || coalesce(v_response.payload->>'segundo_contacto_cargo', '')) ~ 'chef|cocina' then 'chef'
      when lower(coalesce(v_response.payload->>'segundo_contacto_area', '') || ' ' || coalesce(v_response.payload->>'segundo_contacto_cargo', '')) ~ 'almac[eé]n|bodega' then 'almacen'
      when lower(coalesce(v_response.payload->>'segundo_contacto_area', '') || ' ' || coalesce(v_response.payload->>'segundo_contacto_cargo', '')) ~ 'operaci[oó]n|pedido|log[ií]stica' then 'operaciones'
      when lower(coalesce(v_response.payload->>'segundo_contacto_area', '') || ' ' || coalesce(v_response.payload->>'segundo_contacto_cargo', '')) ~ 'admin' then 'administrativo'
      else 'comercial_secundario'
    end;

    if (
      v_secondary_name is not null
      or v_secondary_email is not null
      or nullif(trim(v_response.payload->>'segundo_contacto_cargo'), '') is not null
      or nullif(trim(v_response.payload->>'segundo_contacto_area'), '') is not null
      or nullif(trim(v_response.payload->>'segundo_contacto_celular'), '') is not null
      or nullif(trim(v_response.payload->>'segundo_contacto_telefono_fijo'), '') is not null
    ) and not (
      v_secondary_name is not null
      and v_primary_name is not null
      and lower(v_secondary_name) = lower(trim(v_primary_name))
    ) then
      select id
      into v_secondary_id
      from public.contacts
      where company_id = v_response.company_id
        and id is distinct from v_primary_id
        and coalesce(is_primary, false) = false
        and (
          (v_secondary_name is not null and lower(trim(coalesce(full_name, ''))) = lower(v_secondary_name))
          or (
            v_secondary_name is null
            and v_secondary_email is not null
            and lower(trim(coalesce(email, ''))) = lower(v_secondary_email)
          )
        )
      order by created_at asc nulls last, id asc
      limit 1
      for update;

      if v_secondary_id is null then
        insert into public.contacts (
          company_id,
          company_name,
          full_name,
          role,
          email,
          phone,
          mobile_phone,
          office_phone,
          contact_type,
          priority,
          is_primary,
          source,
          confidence
        ) values (
          v_response.company_id,
          v_company.name,
          v_secondary_name,
          v_secondary_role,
          v_secondary_email,
          coalesce(
            nullif(trim(v_response.payload->>'segundo_contacto_celular'), ''),
            nullif(trim(v_response.payload->>'segundo_contacto_telefono_fijo'), '')
          ),
          nullif(trim(v_response.payload->>'segundo_contacto_celular'), ''),
          nullif(trim(v_response.payload->>'segundo_contacto_telefono_fijo'), ''),
          v_secondary_type,
          2,
          false,
          'formulario_cliente',
          'Alta'
        )
        returning id into v_secondary_id;
      else
        update public.contacts
        set
          company_name = v_company.name,
          full_name = coalesce(v_secondary_name, full_name),
          role = coalesce(v_secondary_role, role),
          email = coalesce(v_secondary_email, email),
          phone = coalesce(
            nullif(trim(v_response.payload->>'segundo_contacto_celular'), ''),
            nullif(trim(v_response.payload->>'segundo_contacto_telefono_fijo'), ''),
            phone
          ),
          mobile_phone = coalesce(nullif(trim(v_response.payload->>'segundo_contacto_celular'), ''), mobile_phone),
          office_phone = coalesce(nullif(trim(v_response.payload->>'segundo_contacto_telefono_fijo'), ''), office_phone),
          contact_type = v_secondary_type,
          priority = 2,
          is_primary = false,
          source = 'formulario_cliente',
          confidence = 'Alta',
          updated_at = now()
        where id = v_secondary_id;
      end if;
    end if;
  end if;

  update public.cu_links
  set
    responded_at = coalesce(responded_at, now()),
    updated_at = now()
  where id = v_response.link_id;

  update public.cu_responses
  set
    status = 'aprobado',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    master_sync_status = case when v_confirm_no_changes then 'no_requerida' else 'pendiente' end,
    master_synced_at = null,
    master_synced_by = null,
    master_sync_notes = null
  where id = p_response_id;
end;
$function$;

create or replace function public.reject_cu_response(p_response_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $function$
  update public.cu_responses
  set
    status = 'rechazado',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    master_sync_status = 'no_requerida',
    master_synced_at = null,
    master_synced_by = null,
    master_sync_notes = null
  where id = p_response_id
    and status = 'pendiente';
$function$;

create or replace function public.get_cu_master_sync_queue()
returns table (
  response_id uuid,
  company_id uuid,
  reviewed_at timestamp with time zone,
  cliente text,
  razon_social text,
  nit text,
  segmento text,
  direccion text,
  company_phone text,
  primary_contact jsonb,
  secondary_contacts jsonb,
  payload jsonb
)
language sql
security invoker
set search_path = ''
as $function$
  select
    r.id,
    r.company_id,
    r.reviewed_at,
    c.name,
    c.legal_name,
    c.nit,
    c.segment,
    c.address,
    c.phone,
    coalesce(primary_contact.contact, '{}'::jsonb),
    coalesce(secondary_contacts.contacts, '[]'::jsonb),
    r.payload
  from public.cu_responses r
  join public.companies c on c.id = r.company_id
  left join lateral (
    select to_jsonb(ct) - 'company_id' - 'created_at' - 'updated_at' as contact
    from public.contacts ct
    where ct.company_id = c.id
    order by coalesce(ct.is_primary, false) desc, ct.priority asc nulls last, ct.created_at asc nulls last, ct.id asc
    limit 1
  ) primary_contact on true
  left join lateral (
    select jsonb_agg(
      to_jsonb(ct) - 'company_id' - 'created_at' - 'updated_at'
      order by ct.priority asc nulls last, ct.created_at asc nulls last, ct.id asc
    ) as contacts
    from public.contacts ct
    where ct.company_id = c.id
      and coalesce(ct.is_primary, false) = false
  ) secondary_contacts on true
  where r.status = 'aprobado'
    and r.master_sync_status = 'pendiente'
  order by r.reviewed_at asc nulls last, r.created_at asc;
$function$;

create or replace function public.complete_cu_master_sync(
  p_response_id uuid,
  p_notes text default null
)
returns void
language sql
security invoker
set search_path = ''
as $function$
  update public.cu_responses
  set
    master_sync_status = 'sincronizado',
    master_synced_at = now(),
    master_synced_by = auth.uid(),
    master_sync_notes = nullif(trim(p_notes), '')
  where id = p_response_id
    and status = 'aprobado'
    and master_sync_status = 'pendiente';
$function$;

revoke execute on function public.get_cu_form(text) from public, anon, authenticated;
grant execute on function public.get_cu_form(text) to anon, authenticated;

revoke execute on function public.get_cu_pending_reviews() from public, anon, authenticated;
grant execute on function public.get_cu_pending_reviews() to authenticated;

revoke execute on function public.approve_cu_response(uuid) from public, anon, authenticated;
grant execute on function public.approve_cu_response(uuid) to authenticated;

revoke execute on function public.reject_cu_response(uuid) from public, anon, authenticated;
grant execute on function public.reject_cu_response(uuid) to authenticated;

revoke execute on function public.get_cu_master_sync_queue() from public, anon, authenticated;
grant execute on function public.get_cu_master_sync_queue() to authenticated;

revoke execute on function public.complete_cu_master_sync(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_cu_master_sync(uuid, text) to authenticated;

-- Remote schema history 20260722031506_fix_customer_update_form_contact_prefill; data backfills and QE2026-only test predicates excluded.
create or replace function public.get_cu_form(p_token text)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'cliente_id', c.id,
    'nombre_cliente', c.name,
    'razon_social', c.legal_name,
    'nit', c.nit,
    'contacto_actual', coalesce(primary_ct.full_name, ''),
    'cargo_contacto_actual', coalesce(primary_ct.role, ''),
    'celular_actual', coalesce(primary_ct.mobile_phone, ''),
    'telefono_fijo_actual', coalesce(primary_ct.office_phone, ''),
    'telefono_actual', coalesce(primary_ct.office_phone, ''),
    'correo_actual', coalesce(primary_ct.email, ''),
    'segundo_contacto_nombre', coalesce(secondary_ct.full_name, ''),
    'segundo_contacto_cargo', coalesce(secondary_ct.role, ''),
    'segundo_contacto_area', coalesce(secondary_ct.contact_type, ''),
    'segundo_contacto_celular', coalesce(secondary_ct.mobile_phone, ''),
    'segundo_contacto_telefono_fijo', coalesce(secondary_ct.office_phone, ''),
    'segundo_contacto_correo', coalesce(secondary_ct.email, ''),
    'telefono_empresa', coalesce(c.phone, ''),
    'direccion_actual', coalesce(c.address, ''),
    'segmento', coalesce(c.segment, '')
  )
  from public.cu_links l
  join public.companies c on c.id = l.company_id
  left join lateral (
    select ct.*
    from public.contacts ct
    where ct.company_id = c.id
    order by
      (nullif(trim(coalesce(l.email_to, '')), '') is not null and lower(trim(coalesce(ct.email, ''))) = lower(trim(l.email_to))) desc,
      (ct.contact_type = 'comercial_principal') desc,
      coalesce(ct.is_primary, false) desc,
      ct.priority asc nulls last,
      ct.updated_at desc nulls last,
      ct.created_at asc nulls last,
      ct.id asc
    limit 1
  ) primary_ct on true
  left join lateral (
    select ct.*
    from public.contacts ct
    where ct.company_id = c.id
      and ct.id is distinct from primary_ct.id
      and (
        ct.contact_type = 'comercial_secundario'
        or coalesce(ct.is_primary, false) = false
        or coalesce(ct.priority, 99) > 1
      )
    order by
      (ct.contact_type = 'comercial_secundario') desc,
      ct.priority asc nulls last,
      ct.updated_at desc nulls last,
      ct.created_at asc nulls last,
      ct.id asc
    limit 1
  ) secondary_ct on true
  where l.token = p_token
    and l.is_active = true
    and (l.expires_at is null or l.expires_at > now())
  limit 1;
$function$;

-- Remote schema history 20260722034019_add_campaign_batch_key; data backfills and QE2026-only test predicates excluded.
alter table public.campaign_pilot_recipients add column if not exists batch_key text;
alter table public.campaign_pilot_recipients alter column batch_key set not null;
alter table public.campaign_pilot_recipients alter column batch_key set default 'pilot-2026-07-21-5';

-- Remote schema history 20260722034030_expand_campaign_batch_constraints; data backfills and QE2026-only test predicates excluded.
alter table public.campaign_pilot_recipients drop constraint if exists campaign_pilot_recipients_link_id_key;
alter table public.campaign_pilot_recipients drop constraint if exists campaign_pilot_recipients_sequence_key;
alter table public.campaign_pilot_recipients drop constraint if exists campaign_pilot_recipients_sequence_check;
alter table public.campaign_pilot_recipients add constraint campaign_pilot_recipients_sequence_check check (sequence between 1 and 100);
alter table public.campaign_pilot_recipients add constraint campaign_pilot_recipients_batch_sequence_key unique (batch_key, sequence);
alter table public.campaign_pilot_recipients add constraint campaign_pilot_recipients_batch_link_key unique (batch_key, link_id);
create index if not exists campaign_pilot_recipients_batch_status_idx on public.campaign_pilot_recipients (batch_key, status);

-- Remote schema history 20260722034045_add_claim_campaign_batch_function; data backfills and QE2026-only test predicates excluded.
create or replace function public.claim_campaign_batch(p_sent_by uuid, p_batch_key text, p_expected_count integer)
returns setof public.campaign_pilot_recipients
language plpgsql
security definer
set search_path = ''
as $function$
declare total_count integer; approved_count integer;
begin
  if p_expected_count < 1 or p_expected_count > 100 then raise exception 'invalid expected campaign batch size'; end if;
  perform pg_advisory_xact_lock(hashtext('quindio-exquisito-campaign-' || p_batch_key));
  select count(*)::integer, count(*) filter (where status='approved')::integer
  into total_count, approved_count
  from public.campaign_pilot_recipients where batch_key=p_batch_key;
  if total_count <> p_expected_count or approved_count <> p_expected_count then raise exception 'campaign batch count mismatch'; end if;
  if exists (
    select 1 from public.campaign_pilot_recipients r join public.cu_links l on l.id=r.link_id
    where r.batch_key=p_batch_key and (
      l.is_active is not true or l.responded_at is not null or
      (l.expires_at is not null and l.expires_at <= now()) or
      lower(btrim(coalesce(l.email_to,''))) <> r.recipient_email
    )
  ) then raise exception 'campaign recipient validation failed'; end if;
  update public.campaign_pilot_recipients
  set status='sending', claimed_at=now(), sent_by=p_sent_by, updated_at=now()
  where batch_key=p_batch_key and status='approved';
  return query select r.* from public.campaign_pilot_recipients r where r.batch_key=p_batch_key order by r.sequence;
end;
$function$;
revoke execute on function public.claim_campaign_batch(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.claim_campaign_batch(uuid,text,integer) to service_role;

-- Remote schema history 20260722142520_fix_customer_update_review_queue; data backfills and QE2026-only test predicates excluded.
create or replace function public.submit_cu_form(p_token text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_response_id uuid;
  v_confirm_no_changes boolean;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Payload must be a JSON object' using errcode = '22023';
  end if;

  if octet_length(p_payload::text) > 32768 then
    raise exception 'Payload exceeds 32 KB' using errcode = '22001';
  end if;

  v_confirm_no_changes := lower(coalesce(p_payload->>'confirm_no_changes', 'false')) = 'true';

  insert into public.cu_responses (
    link_id,
    company_id,
    token,
    payload,
    confirm_no_changes
  )
  select
    id,
    company_id,
    p_token,
    p_payload,
    v_confirm_no_changes
  from public.cu_links
  where token = p_token
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1
  returning id into v_response_id;

  return v_response_id;
end;
$function$;

create or replace function public.get_cu_pending_reviews()
returns table(
  response_id uuid,
  company_id uuid,
  created_at timestamp with time zone,
  status text,
  cliente text,
  razon_social_actual text,
  nit_actual text,
  telefono_actual text,
  correo_actual text,
  direccion_actual text,
  payload jsonb
)
language sql
set search_path to ''
as $function$
  select
    r.id,
    r.company_id,
    r.created_at,
    r.status,
    c.name,
    c.legal_name,
    c.nit,
    coalesce(ct.mobile_phone, ct.office_phone, ct.phone, c.phone, ''),
    coalesce(ct.email, ''),
    coalesce(c.address, ''),
    r.payload
  from public.cu_responses r
  join public.companies c on c.id = r.company_id
  join public.cu_links l on l.id = r.link_id
  left join lateral (
    select phone, mobile_phone, office_phone, email
    from public.contacts
    where company_id = c.id
    order by
      (lower(trim(coalesce(email, ''))) = lower(trim(coalesce(l.email_to, '')))) desc,
      coalesce(is_primary, false) desc,
      priority asc nulls last,
      created_at asc nulls last,
      id asc
    limit 1
  ) ct on true
  where r.status = 'pendiente'
  order by r.created_at desc;
$function$;

-- Remote schema history 20260804203513_fix_campaign_batch_claiming; data backfills and QE2026-only test predicates excluded.
create or replace function public.claim_campaign_pilot_batch(p_sent_by uuid)
returns setof public.campaign_pilot_recipients
language plpgsql
security definer
set search_path = ''
as $function$
declare
  approved_count integer;
  approved_batches integer;
  active_batch text;
begin
  perform pg_advisory_xact_lock(hashtext('quindio-exquisito-campaign-pilot'));

  select
    count(*)::integer,
    count(distinct recipient.batch_key)::integer,
    min(recipient.batch_key)
  into approved_count, approved_batches, active_batch
  from public.campaign_pilot_recipients recipient
  where recipient.status = 'approved';

  if approved_count < 1 or approved_batches <> 1 or active_batch is null then
    raise exception 'there must be exactly one approved campaign batch';
  end if;

  if exists (
    select 1
    from public.campaign_pilot_recipients recipient
    join public.cu_links link on link.id = recipient.link_id
    where recipient.status = 'approved'
      and (
        link.is_active is not true
        or link.responded_at is not null
        or (link.expires_at is not null and link.expires_at <= now())
        or lower(btrim(coalesce(link.email_to, ''))) <> lower(btrim(recipient.recipient_email))
      )
  ) then
    raise exception 'campaign recipient validation failed';
  end if;

  update public.campaign_pilot_recipients
  set
    status = 'sending',
    claimed_at = now(),
    sent_by = p_sent_by,
    updated_at = now()
  where status = 'approved'
    and batch_key = active_batch;

  return query
  select recipient.*
  from public.campaign_pilot_recipients recipient
  where recipient.batch_key = active_batch
  order by recipient.sequence;
end;
$function$;

-- Source: 20260826000000_add_prospect_campaign_targeting.sql (DDL only; 31-row data section excluded)
-- Non-destructive targeting for the verified school campaign north of Calle 153.
-- Existing prospects stay in their master list. New schools are inserted only when absent.

alter table public.prospects
add column if not exists campaign text;

create index if not exists prospects_campaign_idx
on public.prospects (campaign)
where campaign is not null;

-- Source: 20260917000000_phase_9_rbac_foundation.sql
create or replace function private.crm_role()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select member.role
  from private.crm_authorized_users member
  where member.user_id = (select auth.uid())
    and member.active = true
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  limit 1;
$function$;

create or replace function private.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((select private.crm_role()) = 'admin', false);
$function$;

create or replace function private.require_crm_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not (select private.is_crm_admin()) then
    raise exception 'Insufficient CRM role' using errcode = '42501';
  end if;
end;
$function$;

create or replace function public.get_crm_session_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'authorized', role_value is not null,
    'role', role_value
  )
  from (select private.crm_role() as role_value) context;
$function$;

revoke execute on function private.crm_role() from public, anon, authenticated;
revoke execute on function private.is_crm_admin() from public, anon, authenticated;
revoke execute on function private.require_crm_admin() from public, anon, authenticated;
grant execute on function private.crm_role() to authenticated;
grant execute on function private.is_crm_admin() to authenticated;

revoke execute on function public.get_crm_session_context() from public, anon, authenticated;
grant execute on function public.get_crm_session_context() to authenticated;

do $block$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activities', 'companies', 'contacts', 'prospect_lists',
    'prospects', 'prospect_contacts', 'prospect_activities'
  ] loop
    execute format('drop policy if exists crm_allowlist_all on public.%I', table_name);
    execute format(
      'create policy crm_active_select on public.%I for select to authenticated using ((select private.is_crm_authorized()))',
      table_name
    );
    execute format(
      'create policy crm_active_insert on public.%I for insert to authenticated with check ((select private.is_crm_authorized()))',
      table_name
    );
    execute format(
      'create policy crm_active_update on public.%I for update to authenticated using ((select private.is_crm_authorized())) with check ((select private.is_crm_authorized()))',
      table_name
    );
  end loop;

  foreach table_name in array array['cu_links'] loop
    execute format('drop policy if exists crm_allowlist_all on public.%I', table_name);
    execute format(
      'create policy crm_admin_select on public.%I for select to authenticated using ((select private.is_crm_admin()))',
      table_name
    );
    execute format(
      'create policy crm_admin_insert on public.%I for insert to authenticated with check ((select private.is_crm_admin()))',
      table_name
    );
    execute format(
      'create policy crm_admin_update on public.%I for update to authenticated using ((select private.is_crm_admin())) with check ((select private.is_crm_admin()))',
      table_name
    );
  end loop;

  drop policy if exists crm_allowlist_all on public.cu_responses;
  create policy crm_admin_select on public.cu_responses
    for select to authenticated
    using ((select private.is_crm_admin()));
end;
$block$;

revoke all privileges on table
  public.activities,
  public.companies,
  public.contacts,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
from authenticated;

grant select, insert, update on table
  public.activities,
  public.companies,
  public.contacts,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
to authenticated;

grant select, insert, update on table public.cu_links to authenticated;
grant select on table public.cu_responses to authenticated;

revoke delete on table
  public.activities,
  public.companies,
  public.contacts,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
from authenticated;

revoke execute on function public.delete_prospect(uuid) from public, anon;
revoke execute on function public.delete_prospect(uuid) from authenticated;

create or replace function public.admin_get_cu_pending_reviews()
returns table (
  response_id uuid,
  company_id uuid,
  created_at timestamp with time zone,
  status text,
  cliente text,
  razon_social_actual text,
  nit_actual text,
  telefono_actual text,
  correo_actual text,
  direccion_actual text,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  return query select * from public.get_cu_pending_reviews();
end;
$function$;

create or replace function public.admin_get_cu_master_sync_queue()
returns table (
  response_id uuid,
  company_id uuid,
  reviewed_at timestamp with time zone,
  cliente text,
  razon_social text,
  nit text,
  segmento text,
  direccion text,
  company_phone text,
  primary_contact jsonb,
  secondary_contacts jsonb,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  return query select * from public.get_cu_master_sync_queue();
end;
$function$;

create or replace function public.admin_approve_cu_response(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  perform public.approve_cu_response(p_response_id);
end;
$function$;

create or replace function public.admin_reject_cu_response(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  perform public.reject_cu_response(p_response_id);
end;
$function$;

create or replace function public.admin_complete_cu_master_sync(
  p_response_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  perform public.complete_cu_master_sync(p_response_id, p_notes);
end;
$function$;

revoke execute on function public.get_cu_pending_reviews() from public, anon, authenticated;
revoke execute on function public.get_cu_master_sync_queue() from public, anon, authenticated;
revoke execute on function public.approve_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.reject_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.complete_cu_master_sync(uuid, text) from public, anon, authenticated;

revoke execute on function public.admin_get_cu_pending_reviews() from public, anon, authenticated;
revoke execute on function public.admin_get_cu_master_sync_queue() from public, anon, authenticated;
revoke execute on function public.admin_approve_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.admin_reject_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.admin_complete_cu_master_sync(uuid, text) from public, anon, authenticated;

grant execute on function public.admin_get_cu_pending_reviews() to authenticated;
grant execute on function public.admin_get_cu_master_sync_queue() to authenticated;
grant execute on function public.admin_approve_cu_response(uuid) to authenticated;
grant execute on function public.admin_reject_cu_response(uuid) to authenticated;
grant execute on function public.admin_complete_cu_master_sync(uuid, text) to authenticated;
