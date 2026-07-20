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
