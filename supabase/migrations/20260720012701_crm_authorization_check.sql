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
