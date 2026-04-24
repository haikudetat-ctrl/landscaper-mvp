import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";

import { getClientById } from "@/lib/db/clients";
import { updateClientAction } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/app/(app)/clients/client-form";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
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
