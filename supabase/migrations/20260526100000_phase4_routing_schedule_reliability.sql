-- Phase 4: routing and schedule reliability.

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_date date not null,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, route_date)
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  service_visit_id uuid null references public.service_visits(id) on delete set null,
  stop_order int not null check (stop_order > 0),
  status text not null default 'pending' check (status in ('pending', 'en_route', 'arrived', 'completed', 'skipped')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, stop_order)
);

create table if not exists public.route_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  event_type text not null,
  original_order jsonb,
  new_order jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists route_snapshots_org_changed_idx
  on public.route_snapshots (organization_id, changed_at desc);
create index if not exists route_snapshots_route_changed_idx
  on public.route_snapshots (route_id, changed_at desc);

alter table public.route_snapshots enable row level security;
grant select, insert on public.route_snapshots to authenticated;

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

alter table public.routes
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_visits'
      and column_name = 'scheduled_at'
  ) then
    create index if not exists service_visits_org_scheduled_at_idx
      on public.service_visits (organization_id, scheduled_at);
  end if;
end $$;

create index if not exists routes_org_status_date_idx
  on public.routes (organization_id, status, route_date desc);
