import { listClientOptions, listProperties } from "@/lib/db/properties";

import { PropertiesPageShell } from "./properties-page-shell";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await searchParams;
  const [properties, clients] = await Promise.all([listProperties(), listClientOptions()]);

  return (
    <PropertiesPageShell
      properties={properties}
      clients={clients}
      mapProvider={process.env.NEXT_PUBLIC_MAP_PROVIDER === "mapbox" ? "mapbox" : "osm"}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      canRoute={Boolean(process.env.MAPBOX_ACCESS_TOKEN || process.env.OPENROUTESERVICE_API_KEY)}
    />
  );
}
