-- Schema contract repair: align remote/local contract for operational workflows.
-- Non-destructive: additive columns, policy/constraint reconciliation, safe backfills.

-- 1) Ensure issues table exists (missing on remote in some environments).
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

-- 2) Ensure service_visits operational timestamp columns exist.
alter table public.service_visits
  add column if not exists scheduled_at timestamptz,
  add column if not exists route_started_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists work_started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists invoice_generated_at timestamptz,
  add column if not exists paid_at timestamptz;

-- Backfill scheduled_at from scheduled_date where possible.
update public.service_visits
set scheduled_at = coalesce(scheduled_at, (scheduled_date::text || 'T09:00:00Z')::timestamptz)
where scheduled_at is null
  and scheduled_date is not null;

-- Keep completion timestamp fields aligned.
update public.service_visits
set completed_at = coalesce(completed_at, completion_timestamp)
where completion_timestamp is not null;

-- Reconcile service_visits status constraint with app workflow statuses.
alter table public.service_visits drop constraint if exists service_visits_status_check;
alter table public.service_visits drop constraint if exists service_visits_status_phase1_check;
alter table public.service_visits
  add constraint service_visits_status_phase1_check
  check (status in (
    'scheduled', 'confirmed', 'en_route', 'arrived', 'in_progress', 'completed',
    'skipped', 'cancelled', 'delayed_weather', 'blocked_access', 'needs_follow_up',
    'rescheduled', 'paused', 'needs_review', 'pending_reactivation', 'canceled'
  ));

create index if not exists service_visits_org_scheduled_at_idx
  on public.service_visits (organization_id, scheduled_at);

create index if not exists service_visits_org_scheduled_at_phase5_idx
  on public.service_visits (organization_id, scheduled_at, scheduled_date, scheduled_position);

-- 3) Ensure invoices/payments org-scoped lifecycle columns exist.
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

-- Add FKs if missing.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_organization_id_fkey') then
    alter table public.invoices
      add constraint invoices_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_organization_id_fkey') then
    alter table public.payments
      add constraint payments_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;
end $$;

create index if not exists invoices_organization_id_idx on public.invoices (organization_id);
create index if not exists payments_organization_id_idx on public.payments (organization_id);

-- Reconcile payments status constraint.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('expected', 'pending_confirmation', 'received', 'reconciled', 'failed', 'disputed'));

-- 4) Route table parity + RLS hardening.
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.route_snapshots enable row level security;

alter table public.route_stops
  add column if not exists eta_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Keep notes column if old environments have it; no drop.

-- Ensure grants.
grant select, insert, update on public.routes to authenticated;
grant select, insert, update on public.route_stops to authenticated;
grant select, insert on public.route_snapshots to authenticated;

-- Reconcile policies.
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

drop policy if exists "Members can read route snapshots" on public.route_snapshots;
create policy "Members can read route snapshots"
  on public.route_snapshots
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can write route snapshots" on public.route_snapshots;
create policy "Owners/admins can write route snapshots"
  on public.route_snapshots
  for insert
  to authenticated
  with check (public.is_org_owner_or_admin(organization_id));

-- 5) Ensure RLS + policies are present for issues/invoices/payments/leads/events.
alter table public.issues enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.events enable row level security;

grant select, insert, update on public.issues to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert on public.events to authenticated;

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
  with check (organization_id is not null and public.is_org_owner_or_admin(organization_id));

drop policy if exists "Members can update tenant leads" on public.leads;
drop policy if exists "Owners/admins can update tenant leads" on public.leads;
create policy "Owners/admins can update tenant leads"
  on public.leads
  for update
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

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
  with check (public.is_organization_member(organization_id) and (actor_user_id is null or actor_user_id = auth.uid()));

-- 6) Reload PostgREST schema cache.
notify pgrst, 'reload schema';
