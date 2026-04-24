import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";

import { createClientAction, createClientActionWithState } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/app/(app)/clients/client-form";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const params = await searchParams;
  const isOnboarding = params.onboarding === "1";

  return (
    <div className="space-y-4">
      <PageHeader
        title={isOnboarding ? "Onboarding: Step 1 of 3" : "Create Client"}
        description={
          isOnboarding
            ? "Start by creating the client, then continue directly to property and service plan setup."
            : "Add primary contact and billing details."
        }
        actions={<LinkButton href="/clients" label="Back to clients" tone="secondary" />}
      />
      <ClientForm
        action={createClientAction}
        stateAction={isOnboarding ? createClientActionWithState : undefined}
        submitLabel="Create client"
        showCreateAndAddPropertyButton
        requiredFieldsNote={isOnboarding ? "Required: Client display name, or both first and last name." : undefined}
      />
    </div>
  );
}
