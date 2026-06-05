-- Allow owner/admin users to claim legacy public-intake leads that were created
-- before lead intake assigned organization ownership.

create or replace function public.claim_unowned_lead(
  p_lead_id uuid,
  p_organization_id uuid default public.current_user_organization_id()
)
returns public.leads
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_lead public.leads;
begin
  if p_organization_id is null then
    raise exception 'Organization is required to claim a lead' using errcode = '22023';
  end if;

  if not public.is_org_owner_or_admin(p_organization_id) then
    raise exception 'Only organization owners or admins can claim leads' using errcode = '42501';
  end if;

  select *
  into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;

  if v_lead.organization_id is not null then
    if not public.is_org_owner_or_admin(v_lead.organization_id) then
      raise exception 'Lead belongs to another organization' using errcode = '42501';
    end if;

    return v_lead;
  end if;

  update public.leads
  set
    organization_id = p_organization_id,
    updated_at = now(),
    last_activity_at = coalesce(last_activity_at, now())
  where id = p_lead_id
  returning * into v_lead;

  insert into public.events (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    event_type,
    previous_state,
    new_state,
    metadata
  )
  values (
    p_organization_id,
    auth.uid(),
    'lead',
    p_lead_id,
    'lead_claimed',
    '{"organization_id":null}'::jsonb,
    jsonb_build_object('organization_id', p_organization_id),
    jsonb_build_object('source', 'claim_unowned_lead')
  );

  return v_lead;
end;
$$;

revoke all on function public.claim_unowned_lead(uuid, uuid) from public;
grant execute on function public.claim_unowned_lead(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
