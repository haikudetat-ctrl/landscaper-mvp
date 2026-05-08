import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { getCurrentUserMembership } from "@/lib/db/auth";

export const dynamic = "force-dynamic";

export default async function MainAppLayout({ children }: { children: ReactNode }) {
  const { user, membership } = await getCurrentUserMembership();

  if (!user) {
    redirect("/login");
  }

  if (!membership) {
    redirect("/account-pending");
  }

  const supabase = await createSupabaseAuthServerClient();
  const onboardingResult = await supabase
    .from("organization_onboarding")
    .select("status")
    .eq("organization_id", membership.organization_id)
    .limit(1)
    .maybeSingle();

  if ((onboardingResult.data?.status ?? "not_started") !== "completed") {
    redirect("/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}
