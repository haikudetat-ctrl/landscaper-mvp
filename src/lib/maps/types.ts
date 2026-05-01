export type MapProviderName = "mapbox" | "osm";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapStop = MapCoordinate & {
  id: string;
  label?: string | null;
  address?: string | null;
};

export type ProviderMetadata = {
  provider: MapProviderName;
  attribution?: string;
  raw?: unknown;
};

export type GeocodeResult = MapCoordinate & {
  normalizedAddress: string;
  providerMetadata: ProviderMetadata;
};

export type OptimizeRouteInput = {
  start?: MapStop;
  stops: MapStop[];
  end?: MapStop;
};

export type OptimizedRoute = {
  provider: MapProviderName;
  orderedStops: MapStop[];
  route: MapCoordinate[];
  geometry: GeoJSON.LineString | null;
  distance: number | null;
  duration: number | null;
  providerMetadata: ProviderMetadata;
};

export type ExternalNavigationRoute = {
  origin?: MapCoordinate | string | null;
  destination?: MapCoordinate | string | null;
  stops: Array<MapStop | MapCoordinate | string>;
};

export type ExternalNavigationLinks = {
  googleMapsUrl: string | null;
  appleMapsUrl: string | null;
  nextStopAppleMapsUrl: string | null;
};

export type MapProvider = {
  name: MapProviderName;
  geocodeAddress(address: string): Promise<GeocodeResult>;
  optimizeRoute(input: OptimizeRouteInput): Promise<OptimizedRoute>;
};
