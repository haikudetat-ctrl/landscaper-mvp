import { redirect } from "next/navigation";

import { getCurrentUserMembership } from "@/lib/db/auth";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const { user, membership } = await getCurrentUserMembership();

  if (!user) {
    redirect("/login");
  }

  if (membership) {
    redirect("/");
  }

  const defaultOwnerName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9efea] px-4 py-10">
      <OnboardingForm defaultOwnerName={defaultOwnerName} />
    </main>
  );
}
