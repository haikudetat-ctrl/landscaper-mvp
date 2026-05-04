-- Add append-only operational event tracking.
-- Existing domain tables remain the source of current operational state.

CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  actor_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  previous_state jsonb,
  next_state jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_events IS
  'Append-only operational event log for landscaping workflows. Domain tables remain the source of current state.';
COMMENT ON COLUMN public.app_events.entity_type IS
  'Examples: service_visit, invoice, property, client, route.';
COMMENT ON COLUMN public.app_events.event_type IS
  'Examples: visit_scheduled, visit_started, visit_completed, visit_skipped, photo_uploaded, invoice_created, invoice_sent, payment_recorded.';
COMMENT ON COLUMN public.app_events.tenant_id IS
  'Organization/tenant id when known. TODO: make tenant_id NOT NULL after operational tables are fully organization-scoped.';

CREATE INDEX IF NOT EXISTS app_events_tenant_created_at_idx
  ON public.app_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_events_entity_created_at_idx
  ON public.app_events(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_events_event_type_created_at_idx
  ON public.app_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS app_events_actor_created_at_idx
  ON public.app_events(actor_id, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.app_events TO authenticated;

DROP POLICY IF EXISTS "Members can read tenant app events" ON public.app_events;
CREATE POLICY "Members can read tenant app events"
  ON public.app_events
  FOR SELECT
  TO authenticated
  USING (
    (
      tenant_id IS NOT NULL
      AND public.is_organization_member(tenant_id)
    )
    OR (
      -- TODO: remove this fallback after tenant_id is required for every app event.
      tenant_id IS NULL
      AND actor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert tenant app events" ON public.app_events;
CREATE POLICY "Members can insert tenant app events"
  ON public.app_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      (
        tenant_id IS NOT NULL
        AND public.is_organization_member(tenant_id)
      )
      OR (
        -- TODO: remove this fallback after tenant_id is required for every app event.
        tenant_id IS NULL
      )
    )
  );

ALTER TABLE public.service_visits
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS skipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

COMMENT ON COLUMN public.service_visits.last_event_at IS
  'Last operational event timestamp recorded through app_events.';

CREATE OR REPLACE FUNCTION public.record_app_event(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_previous_state jsonb DEFAULT NULL,
  p_next_state jsonb DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_source text DEFAULT 'app'
)
RETURNS public.app_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_event public.app_events;
  v_actor_id uuid := COALESCE(p_actor_id, auth.uid());
BEGIN
  IF NULLIF(trim(p_entity_type), '') IS NULL THEN
    RAISE EXCEPTION 'entity_type is required' USING ERRCODE = '22023';
  END IF;

  IF p_entity_id IS NULL THEN
    RAISE EXCEPTION 'entity_id is required' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(trim(p_event_type), '') IS NULL THEN
    RAISE EXCEPTION 'event_type is required' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NOT NULL AND v_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'actor_id must match authenticated user' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL AND p_tenant_id IS NOT NULL AND NOT public.is_organization_member(p_tenant_id) THEN
    RAISE EXCEPTION 'tenant membership required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.app_events (
    tenant_id,
    actor_id,
    entity_type,
    entity_id,
    event_type,
    previous_state,
    next_state,
    payload,
    metadata,
    source
  )
  VALUES (
    p_tenant_id,
    v_actor_id,
    trim(p_entity_type),
    p_entity_id,
    trim(p_event_type),
    p_previous_state,
    p_next_state,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(NULLIF(trim(p_source), ''), 'app')
  )
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$$;

COMMENT ON FUNCTION public.record_app_event(uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, jsonb, text) IS
  'Append-only event recorder. Does not mutate operational tables.';

CREATE OR REPLACE FUNCTION public.transition_service_visit_state(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_service_visit_id uuid,
  p_event_type text,
  p_scheduled_date date DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_source text DEFAULT 'app'
)
RETURNS TABLE(service_visit jsonb, event public.app_events)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_previous public.service_visits;
  v_updated public.service_visits;
  v_event public.app_events;
  v_event_type text := NULLIF(trim(p_event_type), '');
  v_now timestamptz := now();
  v_next_status text;
  v_skip_reason text := NULLIF(trim(COALESCE(p_payload ->> 'reason', p_payload ->> 'skip_reason')), '');
  v_note text := NULLIF(trim(COALESCE(p_payload ->> 'note', p_payload ->> 'operator_notes')), '');
BEGIN
  IF p_service_visit_id IS NULL THEN
    RAISE EXCEPTION 'service visit id is required' USING ERRCODE = '22023';
  END IF;

  IF v_event_type IS NULL THEN
    RAISE EXCEPTION 'event_type is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_previous
  FROM public.service_visits
  WHERE id = p_service_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service visit not found' USING ERRCODE = 'P0002';
  END IF;

  v_next_status := CASE v_event_type
    WHEN 'visit_scheduled' THEN 'scheduled'
    WHEN 'visit_confirmed' THEN 'confirmed'
    WHEN 'visit_started' THEN 'in_progress'
    WHEN 'visit_completed' THEN 'completed'
    WHEN 'visit_skipped' THEN 'skipped'
    WHEN 'visit_rescheduled' THEN 'rescheduled'
    WHEN 'visit_paused' THEN 'paused'
    WHEN 'visit_needs_review' THEN 'needs_review'
    WHEN 'photo_uploaded' THEN v_previous.status
    ELSE NULL
  END;

  IF v_next_status IS NULL THEN
    RAISE EXCEPTION 'unsupported service visit event_type: %', v_event_type USING ERRCODE = '22023';
  END IF;

  UPDATE public.service_visits
  SET
    status = v_next_status,
    scheduled_date = CASE
      WHEN v_event_type = 'visit_rescheduled' AND p_scheduled_date IS NOT NULL THEN p_scheduled_date
      ELSE scheduled_date
    END,
    confirmed_at = CASE WHEN v_event_type = 'visit_confirmed' THEN v_now ELSE confirmed_at END,
    started_at = CASE WHEN v_event_type = 'visit_started' THEN v_now ELSE started_at END,
    completion_timestamp = CASE WHEN v_event_type = 'visit_completed' THEN v_now ELSE completion_timestamp END,
    skipped_at = CASE WHEN v_event_type = 'visit_skipped' THEN v_now ELSE skipped_at END,
    rescheduled_at = CASE WHEN v_event_type = 'visit_rescheduled' THEN v_now ELSE rescheduled_at END,
    paused_at = CASE WHEN v_event_type = 'visit_paused' THEN v_now ELSE paused_at END,
    needs_review_at = CASE WHEN v_event_type = 'visit_needs_review' THEN v_now ELSE needs_review_at END,
    skip_reason = CASE
      WHEN v_event_type = 'visit_skipped' THEN COALESCE(v_skip_reason, skip_reason, 'Skipped')
      WHEN v_event_type = 'visit_completed' THEN NULL
      ELSE skip_reason
    END,
    operator_notes = CASE
      WHEN v_note IS NOT NULL THEN v_note
      ELSE operator_notes
    END,
    reactivation_required = CASE
      WHEN v_event_type = 'visit_skipped' THEN true
      WHEN v_event_type IN ('visit_scheduled', 'visit_confirmed', 'visit_started', 'visit_completed', 'visit_rescheduled') THEN false
      ELSE reactivation_required
    END,
    last_event_at = v_now,
    updated_at = v_now
  WHERE id = p_service_visit_id
  RETURNING * INTO v_updated;

  v_event := public.record_app_event(
    p_tenant_id,
    p_actor_id,
    'service_visit',
    p_service_visit_id,
    v_event_type,
    to_jsonb(v_previous),
    to_jsonb(v_updated),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb),
    p_source
  );

  RETURN QUERY SELECT to_jsonb(v_updated), v_event;
END;
$$;

COMMENT ON FUNCTION public.transition_service_visit_state(uuid, uuid, uuid, text, date, jsonb, jsonb, text) IS
  'Updates service_visits for supported operational events and records the matching app_events row.';

REVOKE ALL ON FUNCTION public.record_app_event(uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_service_visit_state(uuid, uuid, uuid, text, date, jsonb, jsonb, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_app_event(uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_service_visit_state(uuid, uuid, uuid, text, date, jsonb, jsonb, text) TO authenticated;
