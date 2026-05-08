import { redirect } from "next/navigation";

import { getServicePlanFormOptions } from "@/lib/db/service-plans";
import { getOnboardingContext, getOrganizationImportCounts } from "@/lib/db/onboarding";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const { user, membership, onboarding } = await getOnboardingContext();

  if (!user) {
    redirect("/login");
  }

  if (!membership) {
    redirect("/account-pending");
  }

  if (!onboarding) {
    throw new Error("Onboarding was not initialized.");
  }

  if (onboarding.status === "completed") {
    redirect("/");
  }

  const [{ serviceTypes }, counts] = await Promise.all([
    getServicePlanFormOptions(),
    getOrganizationImportCounts(membership.organization_id),
  ]);

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  return (
    <OnboardingForm
      organizationName={organization?.name ?? "your organization"}
      status={onboarding.status}
      currentStep={onboarding.current_step}
      serviceTypes={serviceTypes}
      counts={counts}
    />
  );
}
