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
