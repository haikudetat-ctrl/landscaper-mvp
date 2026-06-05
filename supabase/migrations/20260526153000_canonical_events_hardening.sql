-- Canonical events hardening: ensure public.events exists and retire legacy app_events.

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
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

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

-- Remove legacy event-path schema now that app writes canonical events directly.
drop function if exists public.transition_service_visit_state(uuid, uuid, uuid, text, date, jsonb, jsonb, text);
drop function if exists public.record_app_event(uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, jsonb, text);
drop table if exists public.app_events;
