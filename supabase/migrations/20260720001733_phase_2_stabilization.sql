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
