import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";

import { getClientById } from "@/lib/db/clients";
import { updateClientAction } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/app/(app)/clients/client-form";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission(PERMISSIONS.clientsRead);
  const { id } = await params;
  const client = await getClientById(id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Client"
        description="Update contact and billing details."
        actions={<LinkButton href={`/clients/${id}`} label="Back to details" tone="secondary" />}
      />
      <ClientForm action={updateClientAction.bind(null, id)} defaultValue={client} submitLabel="Save changes" />
    </div>
  );
}
