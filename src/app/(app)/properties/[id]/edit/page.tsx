import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { getPropertyById } from "@/lib/db/properties";

import { updatePropertyAction } from "@/app/(app)/properties/actions";
import { PropertyForm } from "@/app/(app)/properties/property-form";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission(PERMISSIONS.propertiesRead);
  const { id } = await params;
  const { property, clients } = await getPropertyById(id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Property"
        description="Update address and access details"
        actions={<LinkButton href={`/properties/${id}`} label="Back to details" tone="secondary" />}
      />
      <PropertyForm
        action={updatePropertyAction.bind(null, id)}
        clients={clients}
        defaultValue={property}
        submitLabel="Save changes"
      />
    </div>
  );
}
