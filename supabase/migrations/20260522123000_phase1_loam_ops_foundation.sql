-- Phase 1 LOAM ops foundation additions.
-- Additive and backwards-compatible with existing HDZ MVP flows.

create or replace function public.is_org_owner_or_admin(
  p_organization_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = p_user_id
      and om.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_org_owner_or_admin(uuid, uuid) from public;
grant execute on function public.is_org_owner_or_admin(uuid, uuid) to authenticated;

-- Canonical immutable events table for operational state changes.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_organization_id_idx on public.events (organization_id);
create index if not exists events_entity_idx on public.events (entity_type, entity_id);
create index if not exists events_event_type_idx on public.events (event_type);
create index if not exists events_created_at_idx on public.events (created_at desc);

alter table public.events enable row level security;
grant select, insert on public.events to authenticated;

create or replace function public.prevent_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'events are immutable';
end;
$$;

drop trigger if exists events_no_update on public.events;
create trigger events_no_update
before update on public.events
for each row execute function public.prevent_event_mutation();

drop trigger if exists events_no_delete on public.events;
create trigger events_no_delete
before delete on public.events
for each row execute function public.prevent_event_mutation();

drop policy if exists "Members can read tenant events" on public.events;
create policy "Members can read tenant events"
  on public.events
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can insert tenant events" on public.events;
create policy "Owners/admins can insert tenant events"
  on public.events
  for insert
  to authenticated
  with check (
    public.is_organization_member(organization_id)
    and (
      actor_user_id is null
      or actor_user_id = auth.uid()
    )
  );

-- Route planning tables.
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_date date not null,
  status text not null default 'draft' check (status in ('draft', 'planned', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  service_visit_id uuid null references public.service_visits(id) on delete set null,
  stop_order integer not null check (stop_order > 0),
  status text not null default 'pending' check (status in ('pending', 'en_route', 'arrived', 'completed', 'skipped')),
  eta_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, stop_order)
);

create index if not exists routes_org_date_idx on public.routes (organization_id, route_date desc);
create index if not exists route_stops_route_order_idx on public.route_stops (route_id, stop_order);

alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
grant select, insert, update on public.routes to authenticated;
grant select, insert, update on public.route_stops to authenticated;

drop policy if exists "Members can read routes" on public.routes;
create policy "Members can read routes"
  on public.routes
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can write routes" on public.routes;
create policy "Owners/admins can write routes"
  on public.routes
  for all
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "Members can read route stops" on public.route_stops;
create policy "Members can read route stops"
  on public.route_stops
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can write route stops" on public.route_stops;
create policy "Owners/admins can write route stops"
  on public.route_stops
  for all
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- Issue tracking table.
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_visit_id uuid null references public.service_visits(id) on delete set null,
  property_id uuid null references public.properties(id) on delete set null,
  client_id uuid null references public.clients(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'customer_notified', 'resolved', 'closed')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'urgent')),
  follow_up_required boolean not null default true,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists issues_org_status_idx on public.issues (organization_id, status, created_at desc);

alter table public.issues enable row level security;
grant select, insert, update on public.issues to authenticated;

drop policy if exists "Members can read issues" on public.issues;
create policy "Members can read issues"
  on public.issues
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can write issues" on public.issues;
create policy "Owners/admins can write issues"
  on public.issues
  for all
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- Add organization scope + lifecycle timestamps to invoices/payments.
alter table public.invoices
  add column if not exists organization_id uuid,
  add column if not exists generated_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists due_at timestamptz,
  add column if not exists paid_at timestamptz;

update public.invoices i
set organization_id = coalesce(i.organization_id, c.organization_id)
from public.clients c
where i.client_id = c.id
  and i.organization_id is null;

update public.invoices i
set organization_id = coalesce(i.organization_id, p.organization_id)
from public.properties p
where i.property_id = p.id
  and i.organization_id is null;

alter table public.invoices
  alter column organization_id set default public.current_user_organization_id();

alter table public.invoices
  alter column organization_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_organization_id_fkey') then
    alter table public.invoices
      add constraint invoices_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;
end $$;

create index if not exists invoices_organization_id_idx on public.invoices (organization_id);

alter table public.payments
  add column if not exists organization_id uuid,
  add column if not exists status text not null default 'received',
  add column if not exists updated_at timestamptz not null default now();

update public.payments p
set organization_id = i.organization_id
from public.invoices i
where p.invoice_id = i.id
  and p.organization_id is null;

alter table public.payments
  alter column organization_id set default public.current_user_organization_id();

alter table public.payments
  alter column organization_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_organization_id_fkey') then
    alter table public.payments
      add constraint payments_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;
end $$;

create index if not exists payments_organization_id_idx on public.payments (organization_id);

-- Status constraints aligned to Phase 1 vocabulary.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_status_check') then
    alter table public.payments
      add constraint payments_status_check
      check (status in ('expected', 'pending_confirmation', 'received', 'reconciled', 'failed', 'disputed'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'service_visits_status_phase1_check') then
    alter table public.service_visits
      add constraint service_visits_status_phase1_check
      check (status in (
        'scheduled', 'confirmed', 'en_route', 'arrived', 'in_progress', 'completed',
        'skipped', 'cancelled', 'delayed_weather', 'blocked_access', 'needs_follow_up',
        'rescheduled', 'paused', 'needs_review', 'pending_reactivation', 'canceled'
      ));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_status_phase1_check') then
    alter table public.invoices
      add constraint invoices_status_phase1_check
      check (status in ('draft', 'generated', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'voided'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_status_phase1_check') then
    alter table public.leads
      add constraint leads_status_phase1_check
      check (status in ('new', 'contacted', 'estimate_scheduled', 'estimate_sent', 'won', 'lost', 'stale'));
  end if;
end $$;

-- Service visit timestamps required for operational timeline.
alter table public.service_visits
  add column if not exists scheduled_at timestamptz,
  add column if not exists route_started_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists work_started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists invoice_generated_at timestamptz,
  add column if not exists paid_at timestamptz;

-- Keep existing completion timestamp in sync where possible.
update public.service_visits
set completed_at = coalesce(completed_at, completion_timestamp)
where completion_timestamp is not null;

-- RLS tightening: owner/admin write, org member read for invoices/payments/leads.
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.payments to authenticated;

drop policy if exists "Members can read tenant invoices" on public.invoices;
create policy "Members can read tenant invoices"
  on public.invoices
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can write tenant invoices" on public.invoices;
create policy "Owners/admins can write tenant invoices"
  on public.invoices
  for all
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "Members can read tenant payments" on public.payments;
create policy "Members can read tenant payments"
  on public.payments
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can write tenant payments" on public.payments;
create policy "Owners/admins can write tenant payments"
  on public.payments
  for all
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "Members can insert tenant leads" on public.leads;
create policy "Members can insert tenant leads"
  on public.leads
  for insert
  to authenticated
  with check (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  );

drop policy if exists "Members can update tenant leads" on public.leads;
create policy "Owners/admins can update tenant leads"
  on public.leads
  for update
  to authenticated
  using (organization_id is not null and public.is_org_owner_or_admin(organization_id))
  with check (organization_id is not null and public.is_org_owner_or_admin(organization_id));

-- Customer compatibility view (maps to existing clients table).
create or replace view public.customers as
select * from public.clients;

alter view public.customers set (security_invoker = true);
