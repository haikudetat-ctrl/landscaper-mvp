import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { getCurrentUserMembership } from "@/lib/db/auth";

export type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "import_uploaded"
  | "import_validated"
  | "completed";

export type OnboardingRecord = {
  id: string;
  organization_id: string;
  status: OnboardingStatus;
  current_step: string;
  import_batch_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getOnboardingContext() {
  const { user, membership } = await getCurrentUserMembership();

  if (!user || !membership) {
    return { user, membership, onboarding: null };
  }

  const supabase = await createSupabaseAuthServerClient();
  const ensured = await supabase.rpc("ensure_organization_onboarding", {
    p_organization_id: membership.organization_id,
  });

  let onboarding: OnboardingRecord | null = null;

  if (!ensured.error && ensured.data) {
    onboarding = ensured.data as unknown as OnboardingRecord;
  } else {
    // Fallback for local/dev environments where the RPC migration has not been applied yet.
    const existing = await supabase
      .from("organization_onboarding")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      throw new Error(`Failed to load onboarding: ${existing.error.message}`);
    }

    if (existing.data) {
      onboarding = existing.data as OnboardingRecord;
    } else {
      const created = await supabase
        .from("organization_onboarding")
        .insert({
          organization_id: membership.organization_id,
          status: "not_started",
          current_step: "intro",
        })
        .select("*")
        .single();

      if (created.error || !created.data) {
        throw new Error(`Failed to initialize onboarding: ${created.error?.message ?? "Unknown insert error"}`);
      }

      onboarding = created.data as OnboardingRecord;
    }
  }

  return {
    user,
    membership,
    onboarding,
  };
}

export async function getOrganizationImportCounts(organizationId: string) {
  const supabase = await createSupabaseAuthServerClient();

  const [clientsResult, propertiesResult, plansResult, visitsResult] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("service_plans").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("service_visits").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (propertiesResult.error) throw new Error(propertiesResult.error.message);
  if (plansResult.error) throw new Error(plansResult.error.message);
  if (visitsResult.error) throw new Error(visitsResult.error.message);

  return {
    clients: clientsResult.count ?? 0,
    properties: propertiesResult.count ?? 0,
    services: plansResult.count ?? 0,
    visits: visitsResult.count ?? 0,
  };
}
