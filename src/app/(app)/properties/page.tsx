import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { listProperties } from "@/lib/db/properties";

import { PropertyDashboard } from "./property-dashboard";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await searchParams;
  const properties = await listProperties();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Properties"
        description="Addresses are primary for daily operations."
        actions={<LinkButton href="/properties/new" label="New property" />}
      />

      <PropertyDashboard
        properties={properties}
        mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        canRoute={Boolean(process.env.OPENROUTESERVICE_API_KEY)}
      />
    </div>
  );
}
