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
