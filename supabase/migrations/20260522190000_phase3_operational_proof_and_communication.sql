-- Phase 3: field photo proof + customer communication.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_visit_id uuid null references public.service_visits(id) on delete set null,
  issue_id uuid null,
  storage_path text not null,
  photo_type text not null default 'job' check (photo_type in ('before','after','issue','invoice','job')),
  customer_visible boolean not null default false,
  captured_at timestamptz,
  uploaded_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.issues') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'media_assets_issue_id_fkey'
  ) then
    alter table public.media_assets
      add constraint media_assets_issue_id_fkey
      foreign key (issue_id) references public.issues(id) on delete set null;
  end if;
end $$;

create index if not exists media_assets_org_idx on public.media_assets (organization_id, created_at desc);
create index if not exists media_assets_visit_idx on public.media_assets (service_visit_id, created_at desc);
create index if not exists media_assets_issue_idx on public.media_assets (issue_id, created_at desc);

alter table public.media_assets enable row level security;
grant select, insert, update on public.media_assets to authenticated;

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

drop policy if exists "Members can read media assets" on public.media_assets;
create policy "Members can read media assets"
  on public.media_assets
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Owners/admins can write media assets" on public.media_assets;
create policy "Owners/admins can write media assets"
  on public.media_assets
  for all
  to authenticated
  using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

alter table public.invoices
  add column if not exists sent_preview text,
  add column if not exists sent_by uuid references auth.users(id) on delete set null;

-- Provision expected bucket if missing. Keep private by default.
insert into storage.buckets (id, name, public, file_size_limit)
select 'visit-photos', 'visit-photos', false, 52428800
where not exists (
  select 1 from storage.buckets where id = 'visit-photos'
);

-- Authenticated object access for visit-photos bucket.
drop policy if exists "Authenticated can read visit photos" on storage.objects;
create policy "Authenticated can read visit photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'visit-photos');

drop policy if exists "Authenticated can upload visit photos" on storage.objects;
create policy "Authenticated can upload visit photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'visit-photos');

drop policy if exists "Authenticated can update visit photos" on storage.objects;
create policy "Authenticated can update visit photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'visit-photos')
  with check (bucket_id = 'visit-photos');
