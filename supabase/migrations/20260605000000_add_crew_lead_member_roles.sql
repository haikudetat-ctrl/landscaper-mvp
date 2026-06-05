-- Add crew_lead and crew_member to the allowed roles on organization_members.
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'member', 'crew_lead', 'crew_member'));
