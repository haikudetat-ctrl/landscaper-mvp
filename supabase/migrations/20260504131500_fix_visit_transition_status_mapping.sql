-- Align transition_service_visit_state status mapping to the current
-- service_visits.status check constraint used in this MVP schema.
-- Current valid statuses include: scheduled, rescheduled, completed, skipped, pending_reactivation.

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
    WHEN 'visit_confirmed' THEN 'scheduled'
    WHEN 'visit_started' THEN 'scheduled'
    WHEN 'visit_completed' THEN 'completed'
    WHEN 'visit_skipped' THEN 'skipped'
    WHEN 'visit_rescheduled' THEN 'rescheduled'
    WHEN 'visit_paused' THEN 'rescheduled'
    WHEN 'visit_needs_review' THEN 'pending_reactivation'
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
    rescheduled_at = CASE WHEN v_event_type IN ('visit_rescheduled', 'visit_paused') THEN v_now ELSE rescheduled_at END,
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
      WHEN v_event_type IN ('visit_skipped', 'visit_needs_review') THEN true
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
  'Updates service_visits for supported operational events and records the matching app_events row. Mapping is constrained to current service_visits status enum/check values.';
