import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { getServicePlanFormOptions } from "@/lib/db/service-plans";

import {
  createServicePlanAction,
  createServicePlanActionWithState,
} from "@/app/(app)/service-plans/actions";
import { ServicePlanForm } from "@/app/(app)/service-plans/plan-form";

export default async function NewServicePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; onboarding?: string }>;
}) {
  const params = await searchParams;
  const { properties, serviceTypes } = await getServicePlanFormOptions();
  const isOnboarding = params.onboarding === "1";
  const initialPropertyId =
    params.propertyId && properties.some((property) => property.id === params.propertyId)
      ? params.propertyId
      : undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title={isOnboarding ? "Onboarding: Step 3 of 3" : "Create Service Plan"}
        description={
          isOnboarding
            ? "Set the recurring service details to finish client onboarding."
            : "Define recurring rules for visit generation."
        }
        actions={<LinkButton href="/service-plans" label="Back to plans" tone="secondary" />}
      />

      <ServicePlanForm
        action={createServicePlanAction}
        stateAction={isOnboarding ? createServicePlanActionWithState : undefined}
        properties={properties}
        serviceTypes={serviceTypes}
        initialPropertyId={initialPropertyId}
        submitLabel="Create plan"
        requiredFieldsNote={
          isOnboarding
            ? "Required fields: Property, Plan name, Service type, Frequency, Status, Start date, and Quoted price."
            : undefined
        }
      />
    </div>
  );
}
