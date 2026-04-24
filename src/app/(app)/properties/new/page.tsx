import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { listClientOptions } from "@/lib/db/properties";

import { createPropertyAction, createPropertyActionWithState } from "@/app/(app)/properties/actions";
import { PropertyForm } from "@/app/(app)/properties/property-form";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; onboarding?: string }>;
}) {
  const params = await searchParams;
  const clients = await listClientOptions();
  const isOnboarding = params.onboarding === "1";
  const initialClientId =
    params.clientId && clients.some((client) => client.id === params.clientId)
      ? params.clientId
      : undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title={isOnboarding ? "Onboarding: Step 2 of 3" : "Create Property"}
        description={
          isOnboarding
            ? "Add the property now, then jump directly into service plan setup."
            : "Property records drive service plans, visits, and invoices."
        }
        actions={<LinkButton href="/properties" label="Back to properties" tone="secondary" />}
      />

      <PropertyForm
        action={createPropertyAction}
        stateAction={isOnboarding ? createPropertyActionWithState : undefined}
        clients={clients}
        initialClientId={initialClientId}
        submitLabel="Create property"
        showCreateAndAddPlanButton={isOnboarding}
        requiredFieldsNote={
          isOnboarding ? "Required fields: Client, Address line 1, City, State, and ZIP." : undefined
        }
      />
    </div>
  );
}
