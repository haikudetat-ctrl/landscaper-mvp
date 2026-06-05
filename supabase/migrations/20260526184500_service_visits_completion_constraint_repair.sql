-- Repair completion constraint to align with current app workflow.
-- Completed visits require at least one completion timestamp column.

alter table public.service_visits
  drop constraint if exists service_visits_completed_timestamp_chk;

alter table public.service_visits
  add constraint service_visits_completed_timestamp_chk
  check (
    status <> 'completed'
    or coalesce(completed_at, completion_timestamp) is not null
  );

notify pgrst, 'reload schema';
