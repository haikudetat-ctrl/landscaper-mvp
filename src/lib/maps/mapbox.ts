import type { GeocodeResult, MapProvider, MapStop, OptimizedRoute, OptimizeRouteInput } from "@/lib/maps/types";

const geocodingBaseUrl = "https://api.mapbox.com/search/geocode/v6/forward";
const optimizationBaseUrl = "https://api.mapbox.com/optimized-trips/v1/mapbox/driving";

function getServerToken() {
  return process.env.MAPBOX_ACCESS_TOKEN;
}

function requireToken() {
  const token = getServerToken();
  if (!token) {
    throw new Error("Mapbox access token is not configured.");
  }
  return token;
}

function coordinatePath(stops: MapStop[]) {
  return stops.map((stop) => `${stop.longitude},${stop.latitude}`).join(";");
}

function normalizeOptimizationStops(input: OptimizeRouteInput) {
  return [input.start, ...input.stops, input.end].filter((stop): stop is MapStop => Boolean(stop));
}

export const mapboxProvider: MapProvider = {
  name: "mapbox",

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const token = requireToken();
    const query = address.trim();

    if (!query) {
      throw new Error("Address is required for geocoding.");
    }

    const url = new URL(geocodingBaseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    url.searchParams.set("access_token", token);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Mapbox could not geocode this address.");
    }

    const data = (await response.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: { full_address?: string; name_preferred?: string; name?: string; mapbox_id?: string };
      }>;
    };
    const feature = data.features?.[0];
    const coordinates = feature?.geometry?.coordinates;

    if (!coordinates) {
      throw new Error("Mapbox returned no geocoding result for this address.");
    }

    return {
      latitude: coordinates[1],
      longitude: coordinates[0],
      normalizedAddress: feature.properties?.full_address ?? feature.properties?.name_preferred ?? feature.properties?.name ?? query,
      providerMetadata: {
        provider: "mapbox",
        attribution: "Mapbox Geocoding API",
        raw: {
          mapbox_id: feature.properties?.mapbox_id,
        },
      },
    };
  },

  async optimizeRoute(input: OptimizeRouteInput): Promise<OptimizedRoute> {
    const token = requireToken();
    const allStops = normalizeOptimizationStops(input);

    if (allStops.length === 0) {
      throw new Error("At least one stop is required for route optimization.");
    }

    if (allStops.length === 1) {
      return {
        provider: "mapbox",
        orderedStops: allStops,
        route: allStops.map(({ latitude, longitude }) => ({ latitude, longitude })),
        geometry: {
          type: "LineString",
          coordinates: allStops.map(({ longitude, latitude }) => [longitude, latitude]),
        },
        distance: 0,
        duration: 0,
        providerMetadata: { provider: "mapbox", attribution: "Mapbox Optimization API" },
      };
    }

    if (allStops.length > 12) {
      throw new Error("Mapbox Optimization supports up to 12 coordinates per request for this MVP.");
    }

    const url = new URL(`${optimizationBaseUrl}/${coordinatePath(allStops)}`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("overview", "full");
    url.searchParams.set("roundtrip", "false");
    url.searchParams.set("source", input.start ? "first" : "any");
    url.searchParams.set("destination", input.end ? "last" : "any");

    // This call is intentionally only made from explicit route actions. Do not call it on page load.
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Mapbox could not optimize this route.");
    }

    const data = (await response.json()) as {
      code?: string;
      message?: string;
      trips?: Array<{
        distance?: number;
        duration?: number;
        geometry?: GeoJSON.LineString;
      }>;
      waypoints?: Array<{ waypoint_index?: number }>;
    };

    const trip = data.trips?.[0];
    if (data.code && data.code !== "Ok") {
      throw new Error(data.message ?? "Mapbox could not optimize this route.");
    }

    if (!trip?.geometry?.coordinates) {
      throw new Error("Mapbox returned no route geometry.");
    }

    const orderedStops = allStops
      .map((stop, index) => ({
        stop,
        waypointIndex: data.waypoints?.[index]?.waypoint_index ?? index,
      }))
      .sort((left, right) => left.waypointIndex - right.waypointIndex)
      .map(({ stop }) => stop);

    return {
      provider: "mapbox",
      orderedStops,
      route: trip.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      geometry: trip.geometry,
      distance: trip.distance ?? null,
      duration: trip.duration ?? null,
      providerMetadata: {
        provider: "mapbox",
        attribution: "Mapbox Optimization API",
        raw: {
          code: data.code,
          waypoints: data.waypoints,
        },
      },
    };
  },
};
