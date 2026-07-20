-- Restrict CRM data access to an explicit private allowlist.
-- Roles are recorded for future RBAC; both current roles retain the existing CRM CRUD behavior.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table private.crm_authorized_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table private.crm_authorized_users enable row level security;
revoke all on table private.crm_authorized_users from public, anon, authenticated;

insert into private.crm_authorized_users (user_id, role, active)
values
  ('00e1052a-0a42-4110-a8b1-8674a5bafd39', 'admin', true),
  ('db298892-d846-4c68-b2df-7f26973a5515', 'member', true)
on conflict (user_id) do update
set
  role = excluded.role,
  active = excluded.active,
  updated_at = now();

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
