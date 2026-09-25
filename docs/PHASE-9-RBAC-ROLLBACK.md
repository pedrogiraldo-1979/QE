# Reversión de la base RBAC — Fase 9

## Alcance

Este procedimiento revierte únicamente la migración `phase_9_rbac_foundation`. No revierte datos porque la migración no crea, transforma ni borra filas. No ejecutarlo en un entorno compartido sin una aprobación de release específica.

## Orden operativo

1. Detener la publicación y conservar el commit, hora y síntoma saneado.
2. Revertir primero el deployment de frontend si necesita volver a las RPC heredadas.
3. Ejecutar el SQL de restauración en el mismo entorno y comprobar grants, políticas y advisors.
4. Ejecutar typecheck, pruebas, build y smoke del deployment restaurado.
5. Registrar la causa y decisión en `docs/AUDIT.md`.

## SQL de restauración

```sql
do $block$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activities', 'companies', 'contacts', 'prospect_lists',
    'prospects', 'prospect_contacts', 'prospect_activities'
  ] loop
    execute format('drop policy if exists crm_active_select on public.%I', table_name);
    execute format('drop policy if exists crm_active_insert on public.%I', table_name);
    execute format('drop policy if exists crm_active_update on public.%I', table_name);
    execute format(
      'create policy crm_allowlist_all on public.%I for all to authenticated using ((select private.is_crm_authorized())) with check ((select private.is_crm_authorized()))',
      table_name
    );
  end loop;

  foreach table_name in array array['cu_links', 'cu_responses'] loop
    execute format('drop policy if exists crm_admin_select on public.%I', table_name);
    execute format('drop policy if exists crm_admin_insert on public.%I', table_name);
    execute format('drop policy if exists crm_admin_update on public.%I', table_name);
    execute format(
      'create policy crm_allowlist_all on public.%I for all to authenticated using ((select private.is_crm_authorized())) with check ((select private.is_crm_authorized()))',
      table_name
    );
  end loop;
end;
$block$;

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

grant execute on function public.get_cu_pending_reviews() to authenticated;
grant execute on function public.approve_cu_response(uuid) to authenticated;
grant execute on function public.reject_cu_response(uuid) to authenticated;
grant execute on function public.get_cu_master_sync_queue() to authenticated;
grant execute on function public.complete_cu_master_sync(uuid, text) to authenticated;
grant execute on function public.delete_prospect(uuid) to authenticated;

revoke execute on function public.admin_get_cu_pending_reviews() from authenticated;
revoke execute on function public.admin_get_cu_master_sync_queue() from authenticated;
revoke execute on function public.admin_approve_cu_response(uuid) from authenticated;
revoke execute on function public.admin_reject_cu_response(uuid) from authenticated;
revoke execute on function public.admin_complete_cu_master_sync(uuid, text) from authenticated;
```

El contexto de sesión y los helpers privados pueden permanecer: no conceden permisos por sí mismos y no los usa el frontend previo. Toda publicación posterior debe reaplicar la migración RBAC completa y regenerar los tipos.
