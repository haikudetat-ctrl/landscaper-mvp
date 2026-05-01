import { mapboxProvider } from "@/lib/maps/mapbox";
import { osmProvider } from "@/lib/maps/osm";
import type { MapProvider } from "@/lib/maps/types";

export function getConfiguredMapProvider(): MapProvider {
  const requestedProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER;

  if (requestedProvider === "mapbox") {
    return mapboxProvider;
  }

  if (requestedProvider === "osm") {
    return osmProvider;
  }

  if (process.env.MAPBOX_ACCESS_TOKEN) {
    return mapboxProvider;
  }

  return osmProvider;
}

export * from "@/lib/maps/navigation";
export type * from "@/lib/maps/types";
