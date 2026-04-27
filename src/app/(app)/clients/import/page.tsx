import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { getServicePlanFormOptions } from "@/lib/db/service-plans";

import { ClientImportWizard } from "./client-import-wizard";
import { importClientsAction } from "./actions";

export default async function ClientImportPage() {
  const { serviceTypes } = await getServicePlanFormOptions();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contact Import"
        description="Bulk-create contacts, properties, and first service plans from one editable workspace."
        actions={<LinkButton href="/clients" label="Back to clients" tone="secondary" />}
      />

      <ClientImportWizard action={importClientsAction} serviceTypes={serviceTypes} />
    </div>
  );
}
