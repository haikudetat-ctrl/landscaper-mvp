-- Generic lead intake tables for public-facing landing pages.
-- Keeps existing client/property/service_visit flows unchanged.

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  tenant_slug text NOT NULL,
  source text NOT NULL DEFAULT 'landing_page',
  status text NOT NULL DEFAULT 'new',
  name text NOT NULL,
  phone text NOT NULL,
  email text NULL,
  property_address text NOT NULL,
  services_requested text[] NOT NULL DEFAULT '{}',
  project_description text NOT NULL,
  timeline text NOT NULL,
  budget_range text NOT NULL,
  preferred_contact_method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_tenant_slug_created_at_idx ON public.leads (tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_organization_id_created_at_idx ON public.leads (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_created_at_idx ON public.leads (status, created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;

DROP POLICY IF EXISTS "Members can read tenant leads" ON public.leads;
DROP POLICY IF EXISTS "Members can insert tenant leads" ON public.leads;
DROP POLICY IF EXISTS "Members can update tenant leads" ON public.leads;

CREATE POLICY "Members can read tenant leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (organization_id IS NOT NULL AND public.is_organization_member(organization_id));

CREATE POLICY "Members can insert tenant leads"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IS NULL OR public.is_organization_member(organization_id));

CREATE POLICY "Members can update tenant leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (organization_id IS NOT NULL AND public.is_organization_member(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.is_organization_member(organization_id));

CREATE TABLE IF NOT EXISTS public.lead_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_photos_lead_id_created_at_idx ON public.lead_photos (lead_id, created_at DESC);

ALTER TABLE public.lead_photos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_photos TO authenticated;

DROP POLICY IF EXISTS "Members can read lead photos" ON public.lead_photos;
DROP POLICY IF EXISTS "Members can write lead photos" ON public.lead_photos;

CREATE POLICY "Members can read lead photos"
  ON public.lead_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = lead_photos.lead_id
        AND l.organization_id IS NOT NULL
        AND public.is_organization_member(l.organization_id)
    )
  );

CREATE POLICY "Members can write lead photos"
  ON public.lead_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = lead_photos.lead_id
        AND l.organization_id IS NOT NULL
        AND public.is_organization_member(l.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = lead_photos.lead_id
        AND (l.organization_id IS NULL OR public.is_organization_member(l.organization_id))
    )
  );
