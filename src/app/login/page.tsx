import { redirect } from "next/navigation";

import { getCurrentUserMembership } from "@/lib/db/auth";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

import { LoginPanel } from "./login-panel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const { user, membership } = await getCurrentUserMembership();

  if (user && !membership) {
    redirect("/onboarding");
  }

  if (user && membership) {
    const supabase = await createSupabaseAuthServerClient();
    const onboardingResult = await supabase
      .from("organization_onboarding")
      .select("status")
      .eq("organization_id", membership.organization_id)
      .limit(1)
      .maybeSingle();

    const isComplete = onboardingResult.data?.status === "completed";
    redirect(isComplete ? "/" : "/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9efea] px-4 py-10">
      <LoginPanel nextPath={params.next?.startsWith("/") ? params.next : "/"} />
    </main>
  );
}
