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
