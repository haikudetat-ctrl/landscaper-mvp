create or replace function public.list_today_visits_with_missed_backlog(
  p_target_date date default current_date,
  p_status text default null
)
returns table (
  service_visit_id uuid,
  is_missed_appointment boolean,
  sort_rank integer
)
language sql
stable
as $$
  with matched as (
    select
      sv.id as service_visit_id,
      (
        sv.scheduled_date < p_target_date
        and sv.status in ('scheduled', 'rescheduled', 'skipped', 'pending_reactivation')
      ) as is_missed_appointment,
      sv.scheduled_date,
      sv.scheduled_position
    from public.service_visits sv
    where (
      sv.scheduled_date = p_target_date
      or (
        sv.scheduled_date < p_target_date
        and sv.status in ('scheduled', 'rescheduled', 'skipped', 'pending_reactivation')
      )
    )
    and (p_status is null or sv.status = p_status)
  )
  select
    m.service_visit_id,
    m.is_missed_appointment,
    row_number() over (
      order by
        case when m.scheduled_position is null then 1 else 0 end,
        m.scheduled_position asc nulls last,
        case when m.is_missed_appointment then 0 else 1 end,
        m.scheduled_date asc,
        m.service_visit_id
    )::integer as sort_rank
  from matched m;
$$;
