import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { getServicePlanById } from "@/lib/db/service-plans";

import { ServicePlanForm } from "@/app/(app)/service-plans/plan-form";
import { updateServicePlanAction } from "@/app/(app)/service-plans/actions";

export default async function EditServicePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { plan, properties, serviceTypes } = await getServicePlanById(id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Service Plan"
        description="Update recurrence and pricing details."
        actions={<LinkButton href={`/service-plans/${id}`} label="Back to details" tone="secondary" />}
      />

      <ServicePlanForm
        action={updateServicePlanAction.bind(null, id)}
        properties={properties}
        serviceTypes={serviceTypes}
        defaultValue={plan}
        submitLabel="Save changes"
      />
    </div>
  );
}
