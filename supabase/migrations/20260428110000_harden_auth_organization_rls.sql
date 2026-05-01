-- Harden the MVP auth/organization RLS foundation.
-- Operational landscaping tables are intentionally left unchanged until they
-- have organization_id backfills and scoped policies.

CREATE OR REPLACE FUNCTION public.is_organization_member(
  p_organization_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.organization_role(
  p_organization_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT om.role
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.onboard_organization(
  p_business_name text,
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_organization_id uuid;
  v_business_name text := NULLIF(trim(p_business_name), '');
  v_display_name text := NULLIF(trim(p_display_name), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF v_business_name IS NULL THEN
    RAISE EXCEPTION 'Business name is required' USING ERRCODE = '22023';
  END IF;

  SELECT email
  INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    v_user_id,
    COALESCE(v_display_name, v_user_email, 'Owner'),
    v_user_email
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    email = EXCLUDED.email,
    updated_at = now();

  INSERT INTO public.organizations (name)
  VALUES (v_business_name)
  RETURNING id INTO v_organization_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_organization_id, v_user_id, 'owner')
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = 'owner', updated_at = now();

  RETURN v_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_organization_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.organization_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboard_organization(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.organization_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_organization(text, text) TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can read own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can create their owner membership" ON public.organization_members;
DROP POLICY IF EXISTS "Members can read their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Profiles are readable by self and org peers"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members current_member
      JOIN public.organization_members profile_member
        ON profile_member.organization_id = current_member.organization_id
      WHERE current_member.user_id = auth.uid()
        AND profile_member.user_id = profiles.id
    )
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Members can read memberships in their organizations"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "Owners and admins can invite organization members"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.organization_role(organization_id) IN ('owner', 'admin')
    AND role IN ('admin', 'member')
  );

CREATE POLICY "Owners can manage organization member roles"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (public.organization_role(organization_id) = 'owner')
  WITH CHECK (
    public.organization_role(organization_id) = 'owner'
    AND role IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Owners can remove organization members"
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    public.organization_role(organization_id) = 'owner'
    AND user_id <> auth.uid()
  );

CREATE POLICY "Members can read their organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(id));

CREATE POLICY "Owners and admins can update their organizations"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.organization_role(id) IN ('owner', 'admin'))
  WITH CHECK (public.organization_role(id) IN ('owner', 'admin'));
