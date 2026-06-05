-- Layer 1 operational comments: object-scoped institutional memory.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_entity_type_check check (entity_type in ('lead', 'property', 'visit', 'issue')),
  constraint comments_body_not_blank_check check (char_length(btrim(body)) > 0),
  constraint comments_body_length_check check (char_length(body) <= 4000)
);

create index if not exists comments_organization_id_idx
  on public.comments (organization_id);

create index if not exists comments_entity_idx
  on public.comments (entity_type, entity_id, created_at desc);

create index if not exists comments_author_user_id_idx
  on public.comments (author_user_id, created_at desc);

create or replace function public.set_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_comments_updated_at();

alter table public.comments enable row level security;

grant select, insert, update, delete on public.comments to authenticated;

drop policy if exists "Members can read organization comments" on public.comments;
create policy "Members can read organization comments"
  on public.comments
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Members can create organization comments" on public.comments;
create policy "Members can create organization comments"
  on public.comments
  for insert
  to authenticated
  with check (
    public.is_organization_member(organization_id)
    and author_user_id = auth.uid()
  );

drop policy if exists "Members can update own organization comments" on public.comments;
create policy "Members can update own organization comments"
  on public.comments
  for update
  to authenticated
  using (
    public.is_organization_member(organization_id)
    and author_user_id = auth.uid()
  )
  with check (
    public.is_organization_member(organization_id)
    and author_user_id = auth.uid()
  );

drop policy if exists "Members can delete own organization comments" on public.comments;
create policy "Members can delete own organization comments"
  on public.comments
  for delete
  to authenticated
  using (
    public.is_organization_member(organization_id)
    and author_user_id = auth.uid()
  );

notify pgrst, 'reload schema';
