-- Reconcile legacy constraint drift + RLS policy gaps for actively used tables.
-- Non-destructive: no table drops, no data deletions.

-- 1) communication_log status contract reconciliation
-- App currently uses queued/sent/failed/logged; keep skipped for legacy rows.
alter table public.communication_log
  drop constraint if exists communication_log_status_check;

alter table public.communication_log
  add constraint communication_log_status_check
  check (status in ('queued', 'sent', 'failed', 'skipped', 'logged'));

-- 2) leads status check parity (linked was missing this guardrail)
alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  drop constraint if exists leads_status_phase1_check;

alter table public.leads
  add constraint leads_status_phase1_check
  check (status in ('new', 'contacted', 'estimate_scheduled', 'estimate_sent', 'won', 'lost', 'stale'));

-- 3) RLS hardening for actively-used legacy tables
alter table public.communication_log enable row level security;
alter table public.service_types enable row level security;
alter table public.visit_photos enable row level security;

grant select, insert, update on public.communication_log to authenticated;
grant select on public.service_types to authenticated;
grant select, insert, update on public.visit_photos to authenticated;

-- communication_log policies (org-scoped via related entities)
drop policy if exists "Members can read communication log" on public.communication_log;
create policy "Members can read communication log"
  on public.communication_log
  for select
  to authenticated
  using (
    (
      client_id is not null
      and exists (
        select 1
        from public.clients c
        where c.id = communication_log.client_id
          and public.is_organization_member(c.organization_id)
      )
    )
    or (
      property_id is not null
      and exists (
        select 1
        from public.properties p
        where p.id = communication_log.property_id
          and public.is_organization_member(p.organization_id)
      )
    )
    or (
      service_visit_id is not null
      and exists (
        select 1
        from public.service_visits sv
        where sv.id = communication_log.service_visit_id
          and public.is_organization_member(sv.organization_id)
      )
    )
    or (
      invoice_id is not null
      and exists (
        select 1
        from public.invoices i
        where i.id = communication_log.invoice_id
          and public.is_organization_member(i.organization_id)
      )
    )
  );

drop policy if exists "Owners/admins can write communication log" on public.communication_log;
create policy "Owners/admins can write communication log"
  on public.communication_log
  for all
  to authenticated
  using (
    (
      client_id is not null
      and exists (
        select 1
        from public.clients c
        where c.id = communication_log.client_id
          and public.is_org_owner_or_admin(c.organization_id)
      )
    )
    or (
      property_id is not null
      and exists (
        select 1
        from public.properties p
        where p.id = communication_log.property_id
          and public.is_org_owner_or_admin(p.organization_id)
      )
    )
    or (
      service_visit_id is not null
      and exists (
        select 1
        from public.service_visits sv
        where sv.id = communication_log.service_visit_id
          and public.is_org_owner_or_admin(sv.organization_id)
      )
    )
    or (
      invoice_id is not null
      and exists (
        select 1
        from public.invoices i
        where i.id = communication_log.invoice_id
          and public.is_org_owner_or_admin(i.organization_id)
      )
    )
  )
  with check (
    (
      client_id is not null
      and exists (
        select 1
        from public.clients c
        where c.id = communication_log.client_id
          and public.is_org_owner_or_admin(c.organization_id)
      )
    )
    or (
      property_id is not null
      and exists (
        select 1
        from public.properties p
        where p.id = communication_log.property_id
          and public.is_org_owner_or_admin(p.organization_id)
      )
    )
    or (
      service_visit_id is not null
      and exists (
        select 1
        from public.service_visits sv
        where sv.id = communication_log.service_visit_id
          and public.is_org_owner_or_admin(sv.organization_id)
      )
    )
    or (
      invoice_id is not null
      and exists (
        select 1
        from public.invoices i
        where i.id = communication_log.invoice_id
          and public.is_org_owner_or_admin(i.organization_id)
      )
    )
  );

-- service_types policies (reference table; authenticated read-only)
drop policy if exists "Authenticated can read service types" on public.service_types;
create policy "Authenticated can read service types"
  on public.service_types
  for select
  to authenticated
  using (true);

-- visit_photos policies (org-scoped via parent service_visit)
drop policy if exists "Members can read visit photos" on public.visit_photos;
create policy "Members can read visit photos"
  on public.visit_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.service_visits sv
      where sv.id = visit_photos.service_visit_id
        and public.is_organization_member(sv.organization_id)
    )
  );

drop policy if exists "Owners/admins can write visit photos" on public.visit_photos;
create policy "Owners/admins can write visit photos"
  on public.visit_photos
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.service_visits sv
      where sv.id = visit_photos.service_visit_id
        and public.is_org_owner_or_admin(sv.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.service_visits sv
      where sv.id = visit_photos.service_visit_id
        and public.is_org_owner_or_admin(sv.organization_id)
    )
  );

notify pgrst, 'reload schema';
