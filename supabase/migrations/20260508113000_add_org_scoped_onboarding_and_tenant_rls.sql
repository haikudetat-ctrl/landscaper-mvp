-- Add tenant-scoped onboarding and harden business-table tenancy with organization RLS.

CREATE OR REPLACE FUNCTION public.current_user_organization_id(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = p_user_id
  ORDER BY
    CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
    om.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_organization_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id(uuid) TO authenticated;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.service_plans ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.service_visits ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
DECLARE
  v_fallback_org_id uuid;
BEGIN
  SELECT id INTO v_fallback_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;

  UPDATE public.clients
  SET organization_id = COALESCE(organization_id, v_fallback_org_id)
  WHERE organization_id IS NULL;

  UPDATE public.properties p
  SET organization_id = COALESCE(p.organization_id, c.organization_id, v_fallback_org_id)
  FROM public.clients c
  WHERE p.client_id = c.id
    AND p.organization_id IS NULL;

  UPDATE public.service_plans sp
  SET organization_id = COALESCE(sp.organization_id, p.organization_id, v_fallback_org_id)
  FROM public.properties p
  WHERE sp.property_id = p.id
    AND sp.organization_id IS NULL;

  UPDATE public.service_visits sv
  SET organization_id = COALESCE(
    sv.organization_id,
    sp.organization_id,
    v_fallback_org_id
  )
  FROM public.service_plans sp
  WHERE sv.service_plan_id = sp.id
    AND sv.organization_id IS NULL;

  UPDATE public.service_visits sv
  SET organization_id = COALESCE(
    sv.organization_id,
    p.organization_id,
    v_fallback_org_id
  )
  FROM public.properties p
  WHERE sv.property_id = p.id
    AND sv.organization_id IS NULL;
END;
$$;

ALTER TABLE public.clients
  ALTER COLUMN organization_id SET DEFAULT public.current_user_organization_id(),
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.properties
  ALTER COLUMN organization_id SET DEFAULT public.current_user_organization_id(),
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.service_plans
  ALTER COLUMN organization_id SET DEFAULT public.current_user_organization_id(),
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.service_visits
  ALTER COLUMN organization_id SET DEFAULT public.current_user_organization_id(),
  ALTER COLUMN organization_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_organization_id_fkey'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_organization_id_fkey'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_plans_organization_id_fkey'
  ) THEN
    ALTER TABLE public.service_plans
      ADD CONSTRAINT service_plans_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_visits_organization_id_fkey'
  ) THEN
    ALTER TABLE public.service_visits
      ADD CONSTRAINT service_visits_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS clients_organization_id_idx ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS properties_organization_id_idx ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS service_plans_organization_id_idx ON public.service_plans(organization_id);
CREATE INDEX IF NOT EXISTS service_visits_organization_id_idx ON public.service_visits(organization_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_visits TO authenticated;

DROP POLICY IF EXISTS "Members can read tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Members can insert tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Members can update tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Members can delete tenant clients" ON public.clients;
CREATE POLICY "Members can read tenant clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "Members can insert tenant clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can update tenant clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can delete tenant clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "Members can read tenant properties" ON public.properties;
DROP POLICY IF EXISTS "Members can insert tenant properties" ON public.properties;
DROP POLICY IF EXISTS "Members can update tenant properties" ON public.properties;
DROP POLICY IF EXISTS "Members can delete tenant properties" ON public.properties;
CREATE POLICY "Members can read tenant properties"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "Members can insert tenant properties"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can update tenant properties"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can delete tenant properties"
  ON public.properties
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "Members can read tenant service plans" ON public.service_plans;
DROP POLICY IF EXISTS "Members can insert tenant service plans" ON public.service_plans;
DROP POLICY IF EXISTS "Members can update tenant service plans" ON public.service_plans;
DROP POLICY IF EXISTS "Members can delete tenant service plans" ON public.service_plans;
CREATE POLICY "Members can read tenant service plans"
  ON public.service_plans
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "Members can insert tenant service plans"
  ON public.service_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can update tenant service plans"
  ON public.service_plans
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can delete tenant service plans"
  ON public.service_plans
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "Members can read tenant service visits" ON public.service_visits;
DROP POLICY IF EXISTS "Members can insert tenant service visits" ON public.service_visits;
DROP POLICY IF EXISTS "Members can update tenant service visits" ON public.service_visits;
DROP POLICY IF EXISTS "Members can delete tenant service visits" ON public.service_visits;
CREATE POLICY "Members can read tenant service visits"
  ON public.service_visits
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "Members can insert tenant service visits"
  ON public.service_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can update tenant service visits"
  ON public.service_visits
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can delete tenant service visits"
  ON public.service_visits
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE TABLE IF NOT EXISTS public.organization_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'import_uploaded', 'import_validated', 'completed')),
  current_step text NOT NULL DEFAULT 'welcome',
  import_batch_id uuid NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_onboarding ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.organization_onboarding TO authenticated;

DROP POLICY IF EXISTS "Members can read own organization onboarding" ON public.organization_onboarding;
DROP POLICY IF EXISTS "Members can insert own organization onboarding" ON public.organization_onboarding;
DROP POLICY IF EXISTS "Members can update own organization onboarding" ON public.organization_onboarding;
CREATE POLICY "Members can read own organization onboarding"
  ON public.organization_onboarding
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));
CREATE POLICY "Members can insert own organization onboarding"
  ON public.organization_onboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Members can update own organization onboarding"
  ON public.organization_onboarding
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE OR REPLACE FUNCTION public.ensure_organization_onboarding(
  p_organization_id uuid
)
RETURNS public.organization_onboarding
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.organization_onboarding;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organization_onboarding (organization_id)
  VALUES (p_organization_id)
  ON CONFLICT (organization_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_organization_onboarding(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_organization_onboarding(uuid) TO authenticated;
