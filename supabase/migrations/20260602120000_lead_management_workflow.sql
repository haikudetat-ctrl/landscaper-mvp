-- First-pass lead management workflow.
-- Uses existing leads.status as the canonical pipeline stage and adds only
-- lifecycle fields needed to manage conversion without losing intake history.

alter table public.leads
  add column if not exists lost_reason text,
  add column if not exists converted_client_id uuid null references public.clients(id) on delete set null,
  add column if not exists converted_property_id uuid null references public.properties(id) on delete set null,
  add column if not exists converted_at timestamptz,
  add column if not exists last_activity_at timestamptz;

update public.leads
set status = case
    when status = 'estimate_scheduled' then 'site_visit_scheduled'
    when status = 'stale' then 'follow_up'
    else status
  end,
  last_activity_at = coalesce(last_activity_at, updated_at, created_at)
where status in ('estimate_scheduled', 'stale')
   or last_activity_at is null;

alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  drop constraint if exists leads_status_phase1_check;

alter table public.leads
  add constraint leads_status_phase1_check
  check (
    status in (
      'new',
      'contacted',
      'qualified',
      'site_visit_scheduled',
      'estimate_sent',
      'follow_up',
      'won',
      'lost'
    )
  );

create index if not exists leads_organization_status_activity_idx
  on public.leads (organization_id, status, last_activity_at desc);

create index if not exists leads_converted_client_id_idx
  on public.leads (converted_client_id)
  where converted_client_id is not null;

create index if not exists leads_converted_property_id_idx
  on public.leads (converted_property_id)
  where converted_property_id is not null;

alter table public.communication_log
  add column if not exists lead_id uuid null references public.leads(id) on delete set null;

create index if not exists communication_log_lead_id_created_at_idx
  on public.communication_log (lead_id, created_at desc)
  where lead_id is not null;

drop policy if exists "Members can read communication log" on public.communication_log;
create policy "Members can read communication log"
  on public.communication_log
  for select
  to authenticated
  using (
    (
      lead_id is not null
      and exists (
        select 1
        from public.leads l
        where l.id = communication_log.lead_id
          and l.organization_id is not null
          and public.is_organization_member(l.organization_id)
      )
    )
    or (
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
      lead_id is not null
      and exists (
        select 1
        from public.leads l
        where l.id = communication_log.lead_id
          and l.organization_id is not null
          and public.is_org_owner_or_admin(l.organization_id)
      )
    )
    or (
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
      lead_id is not null
      and exists (
        select 1
        from public.leads l
        where l.id = communication_log.lead_id
          and l.organization_id is not null
          and public.is_org_owner_or_admin(l.organization_id)
      )
    )
    or (
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

notify pgrst, 'reload schema';
