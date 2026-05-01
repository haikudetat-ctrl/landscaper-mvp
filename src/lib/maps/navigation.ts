import type { ExternalNavigationLinks, ExternalNavigationRoute, MapCoordinate } from "@/lib/maps/types";

function coordinateLabel(value: MapCoordinate | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return `${value.latitude},${value.longitude}`;
}

export function buildExternalNavigationLinks(route: ExternalNavigationRoute): ExternalNavigationLinks {
  const origin = coordinateLabel(route.origin);
  const stops = route.stops.map(coordinateLabel).filter((stop): stop is string => Boolean(stop));
  const destination = coordinateLabel(route.destination) ?? stops.at(-1) ?? null;
  const waypoints = destination ? stops.slice(0, -1) : stops;

  const googleUrl = new URL("https://www.google.com/maps/dir/");
  googleUrl.searchParams.set("api", "1");
  if (origin) googleUrl.searchParams.set("origin", origin);
  if (destination) googleUrl.searchParams.set("destination", destination);
  if (waypoints.length > 0) googleUrl.searchParams.set("waypoints", waypoints.join("|"));
  googleUrl.searchParams.set("travelmode", "driving");

  const appleUrl = new URL("https://maps.apple.com/");
  if (origin) appleUrl.searchParams.set("saddr", origin);
  if (destination) appleUrl.searchParams.set("daddr", destination);
  appleUrl.searchParams.set("dirflg", "d");

  const nextStop = stops[0] ?? destination;
  const nextStopAppleUrl = nextStop ? new URL("https://maps.apple.com/") : null;
  if (nextStopAppleUrl) {
    if (origin) nextStopAppleUrl.searchParams.set("saddr", origin);
    nextStopAppleUrl.searchParams.set("daddr", nextStop);
    nextStopAppleUrl.searchParams.set("dirflg", "d");
  }

  return {
    googleMapsUrl: destination ? googleUrl.toString() : null,
    appleMapsUrl: destination ? appleUrl.toString() : null,
    nextStopAppleMapsUrl: nextStopAppleUrl?.toString() ?? null,
  };
}
