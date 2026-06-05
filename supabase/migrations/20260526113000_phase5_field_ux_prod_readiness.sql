-- Phase 5: field UX hardening + production readiness.

alter table public.service_visits
  add column if not exists scheduled_at timestamptz;

update public.service_visits
set scheduled_at = coalesce(
  scheduled_at,
  (scheduled_date::timestamp + time '08:00') at time zone 'America/New_York'
)
where scheduled_date is not null;

create index if not exists service_visits_org_scheduled_at_phase5_idx
  on public.service_visits (organization_id, scheduled_at, scheduled_date, scheduled_position);

create or replace function public.storage_path_org_id(p_path text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_segment text;
begin
  v_segment := split_part(coalesce(p_path, ''), '/', 1);
  if v_segment = '' then
    return null;
  end if;
  return v_segment::uuid;
exception
  when others then
    return null;
end;
$$;

drop policy if exists "Authenticated can read visit photos" on storage.objects;
drop policy if exists "Authenticated can upload visit photos" on storage.objects;
drop policy if exists "Authenticated can update visit photos" on storage.objects;

create policy "Org members can read visit photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'visit-photos'
    and public.is_organization_member(public.storage_path_org_id(name))
  );

create policy "Owners/admins can upload visit photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'visit-photos'
    and public.is_org_owner_or_admin(public.storage_path_org_id(name))
  );

create policy "Owners/admins can update visit photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'visit-photos'
    and public.is_org_owner_or_admin(public.storage_path_org_id(name))
  )
  with check (
    bucket_id = 'visit-photos'
    and public.is_org_owner_or_admin(public.storage_path_org_id(name))
  );
