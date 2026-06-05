import type { GeocodeResult, MapProvider, MapStop, OptimizedRoute, OptimizeRouteInput } from "@/lib/maps/types";

function getOpenRouteServiceToken() {
  return process.env.OPENROUTESERVICE_API_KEY;
}

function normalizeStops(input: OptimizeRouteInput) {
  return [input.start, ...input.stops, input.end].filter((stop): stop is MapStop => Boolean(stop));
}

export const osmProvider: MapProvider = {
  name: "osm",

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "LOAM-LandscapingOps/1.0 (https://loam.app)",
      },
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "Unknown error");
      throw new Error(`OSM geocoding failed (${response.status}): ${message}`);
    }

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    const result = data[0];

    if (!result) {
      throw new Error(`No geocoding results found for address: "${address}"`);
    }

    return {
      latitude: Number.parseFloat(result.lat),
      longitude: Number.parseFloat(result.lon),
      normalizedAddress: result.display_name,
      providerMetadata: {
        provider: "osm",
        attribution: "OpenStreetMap contributors",
      },
    };
  },

  async optimizeRoute(input: OptimizeRouteInput): Promise<OptimizedRoute> {
    const token = getOpenRouteServiceToken();
    if (!token) {
      throw new Error("OpenRouteService API key is not configured.");
    }

    const stops = normalizeStops(input);
    if (stops.length < 2) {
      throw new Error("At least two geocoded stops are required for route generation.");
    }

    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: stops.map((stop) => [stop.longitude, stop.latitude]),
      }),
    });

    if (!response.ok) {
      throw new Error("OpenRouteService could not generate a route.");
    }

    const data = (await response.json()) as {
      features?: Array<{
        geometry?: GeoJSON.LineString;
        properties?: { summary?: { distance?: number; duration?: number } };
      }>;
    };
    const feature = data.features?.[0];

    if (!feature?.geometry?.coordinates) {
      throw new Error("OpenRouteService returned no route geometry.");
    }

    return {
      provider: "osm",
      orderedStops: stops,
      route: feature.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      geometry: feature.geometry,
      distance: feature.properties?.summary?.distance ?? null,
      duration: feature.properties?.summary?.duration ?? null,
      providerMetadata: {
        provider: "osm",
        attribution: "OpenRouteService / OpenStreetMap",
      },
    };
  },
};
