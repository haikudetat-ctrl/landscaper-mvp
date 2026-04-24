import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";

import { createClientAction } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/app/(app)/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Create Client"
        description="Add primary contact and billing details."
        actions={<LinkButton href="/clients" label="Back to clients" tone="secondary" />}
      />
      <ClientForm action={createClientAction} submitLabel="Create client" />
    </div>
  );
}
