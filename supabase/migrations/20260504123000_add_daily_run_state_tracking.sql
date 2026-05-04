-- Persist per-user daily run progress so operators can resume /run without re-confirming jobs.
-- Additive only: does not alter existing operational tables.

CREATE TABLE IF NOT EXISTS public.daily_run_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_date date NOT NULL,
  phase text NOT NULL DEFAULT 'morning',
  active_visit_id uuid NULL REFERENCES public.service_visits(id) ON DELETE SET NULL,
  confirmed_today boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, run_date)
);

COMMENT ON TABLE public.daily_run_state IS
  'Per-user persisted progress for daily run UX (phase, active visit, confirmation state) keyed by organization and date.';
COMMENT ON COLUMN public.daily_run_state.phase IS
  'Run UI phase. Expected values: morning, confirm, ready, running, summary, collections.';

CREATE INDEX IF NOT EXISTS daily_run_state_org_date_idx
  ON public.daily_run_state(organization_id, run_date DESC);

CREATE INDEX IF NOT EXISTS daily_run_state_user_date_idx
  ON public.daily_run_state(user_id, run_date DESC);

ALTER TABLE public.daily_run_state ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.daily_run_state TO authenticated;

DROP POLICY IF EXISTS "Members can read own organization run state" ON public.daily_run_state;
CREATE POLICY "Members can read own organization run state"
  ON public.daily_run_state
  FOR SELECT
  TO authenticated
  USING (
    public.is_organization_member(organization_id)
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members can upsert own organization run state" ON public.daily_run_state;
CREATE POLICY "Members can upsert own organization run state"
  ON public.daily_run_state
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members can update own organization run state" ON public.daily_run_state;
CREATE POLICY "Members can update own organization run state"
  ON public.daily_run_state
  FOR UPDATE
  TO authenticated
  USING (
    public.is_organization_member(organization_id)
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.upsert_daily_run_state(
  p_organization_id uuid,
  p_user_id uuid,
  p_run_date date,
  p_phase text,
  p_active_visit_id uuid DEFAULT NULL,
  p_confirmed_today boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.daily_run_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.daily_run_state;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_run_date IS NULL THEN
    RAISE EXCEPTION 'run_date is required' USING ERRCODE = '22023';
  END IF;

  IF p_phase IS NULL OR btrim(p_phase) = '' THEN
    RAISE EXCEPTION 'phase is required' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to write run state for another user' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_organization_member(p_organization_id, p_user_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.daily_run_state (
    organization_id,
    user_id,
    run_date,
    phase,
    active_visit_id,
    confirmed_today,
    metadata,
    updated_at
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_run_date,
    p_phase,
    p_active_visit_id,
    p_confirmed_today,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  )
  ON CONFLICT (organization_id, user_id, run_date)
  DO UPDATE SET
    phase = EXCLUDED.phase,
    active_visit_id = EXCLUDED.active_visit_id,
    confirmed_today = EXCLUDED.confirmed_today,
    metadata = COALESCE(EXCLUDED.metadata, public.daily_run_state.metadata),
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_run_state(
  p_organization_id uuid,
  p_user_id uuid,
  p_run_date date
)
RETURNS public.daily_run_state
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT drs.*
  FROM public.daily_run_state drs
  WHERE drs.organization_id = p_organization_id
    AND drs.user_id = p_user_id
    AND drs.run_date = p_run_date
    AND auth.uid() = p_user_id
    AND public.is_organization_member(p_organization_id, p_user_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.upsert_daily_run_state(uuid, uuid, date, text, uuid, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_daily_run_state(uuid, uuid, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_daily_run_state(uuid, uuid, date, text, uuid, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_run_state(uuid, uuid, date) TO authenticated;
