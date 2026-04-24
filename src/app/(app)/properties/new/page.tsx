import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { listClientOptions } from "@/lib/db/properties";

import { createPropertyAction } from "@/app/(app)/properties/actions";
import { PropertyForm } from "@/app/(app)/properties/property-form";

export default async function NewPropertyPage() {
  const clients = await listClientOptions();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Create Property"
        description="Property records drive service plans, visits, and invoices."
        actions={<LinkButton href="/properties" label="Back to properties" tone="secondary" />}
      />

      <PropertyForm action={createPropertyAction} clients={clients} submitLabel="Create property" />
    </div>
  );
}
