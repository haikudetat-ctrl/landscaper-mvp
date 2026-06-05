-- Recurring visit generation contract.
-- Add lineage metadata for one-next-visit generation after a recurring visit is completed.

alter table public.service_visits
  add column if not exists generated_from_visit_id uuid null references public.service_visits(id) on delete set null,
  add column if not exists generation_reason text null,
  add column if not exists recurrence_sequence integer not null default 1;

alter table public.service_visits
  drop constraint if exists service_visits_generation_reason_check;

alter table public.service_visits
  add constraint service_visits_generation_reason_check
  check (generation_reason is null or generation_reason in ('recurring_completion'));

alter table public.service_visits
  drop constraint if exists service_visits_recurrence_sequence_check;

alter table public.service_visits
  add constraint service_visits_recurrence_sequence_check
  check (recurrence_sequence >= 1);

create index if not exists service_visits_generated_from_visit_id_idx
  on public.service_visits (generated_from_visit_id);

create unique index if not exists service_visits_recurring_generated_from_uidx
  on public.service_visits (organization_id, generated_from_visit_id)
  where generation_reason = 'recurring_completion'
    and generated_from_visit_id is not null
    and status not in ('cancelled', 'canceled', 'skipped');

create unique index if not exists service_visits_recurring_plan_property_date_uidx
  on public.service_visits (organization_id, service_plan_id, property_id, scheduled_date)
  where generation_reason = 'recurring_completion'
    and service_plan_id is not null
    and status not in ('cancelled', 'canceled', 'skipped');

comment on column public.service_visits.generated_from_visit_id is
  'Completed service visit that generated this recurring follow-up visit.';
comment on column public.service_visits.generation_reason is
  'Why this visit was generated. recurring_completion means one next visit created after completing a recurring service plan visit.';
comment on column public.service_visits.recurrence_sequence is
  'One-based sequence within a recurring service chain. Generated visits increment from the completed visit.';

notify pgrst, 'reload schema';
