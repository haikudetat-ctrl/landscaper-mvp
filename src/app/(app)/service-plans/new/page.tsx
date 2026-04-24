import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { getServicePlanFormOptions } from "@/lib/db/service-plans";

import { createServicePlanAction } from "@/app/(app)/service-plans/actions";
import { ServicePlanForm } from "@/app/(app)/service-plans/plan-form";

export default async function NewServicePlanPage() {
  const { properties, serviceTypes } = await getServicePlanFormOptions();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Create Service Plan"
        description="Define recurring rules for visit generation."
        actions={<LinkButton href="/service-plans" label="Back to plans" tone="secondary" />}
      />

      <ServicePlanForm
        action={createServicePlanAction}
        properties={properties}
        serviceTypes={serviceTypes}
        submitLabel="Create plan"
      />
    </div>
  );
}
