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
