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
