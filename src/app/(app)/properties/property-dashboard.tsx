"use client";

import { useMemo, useState } from "react";

import { PropertyCard } from "@/components/cards";
import { MapboxRouteMap } from "@/components/maps/mapbox-route-map";
import { BottomSheetDialog } from "@/components/ui/bottom-sheet-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { buildExternalNavigationLinks } from "@/lib/maps/navigation";
import { formatAddress } from "@/lib/utils/format";

type ClientRelation = {
  id: string;
  full_name: string;
  primary_email: string | null;
  primary_phone: string | null;
};

export type PropertyDashboardRecord = {
  id: string;
  property_name: string | null;
  street_1: string;
  street_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  service_notes: string | null;
  access_notes: string | null;
  clients: ClientRelation | ClientRelation[] | null;
};

type RouteResult = {
  provider?: "mapbox" | "osm";
  orderedStops?: Array<{ id: string; latitude: number; longitude: number; label?: string | null; address?: string | null }>;
  route: Array<{ latitude: number; longitude: number }>;
  geometry?: GeoJSON.LineString | null;
  summary: { distance?: number; duration?: number } | null;
};

type MapStyle = "osm" | "mapbox";
type MappableProperty = PropertyDashboardRecord & {
  latitude: number;
  longitude: number;
};

const tileSize = 256;
const fallbackCenter = { latitude: 39.747, longitude: -75.13 };

function getClientName(property: PropertyDashboardRecord) {
  const client = Array.isArray(property.clients) ? property.clients[0] : property.clients;
  return client?.full_name ?? "-";
}

function isMappable(property: PropertyDashboardRecord): property is MappableProperty {
  return typeof property.latitude === "number" && typeof property.longitude === "number";
}

function lonToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latToTileY(latitude: number, zoom: number) {
  const radians = (latitude * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom;
}

function projectPoint(
  coordinate: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  zoom: number,
) {
  const centerX = lonToTileX(center.longitude, zoom) * tileSize;
  const centerY = latToTileY(center.latitude, zoom) * tileSize;
  const pointX = lonToTileX(coordinate.longitude, zoom) * tileSize;
  const pointY = latToTileY(coordinate.latitude, zoom) * tileSize;

  return {
    x: 50 + ((pointX - centerX) / 960) * 100,
    y: 50 + ((pointY - centerY) / 520) * 100,
  };
}

function tileUrl(style: MapStyle, x: number, y: number, zoom: number, mapboxToken?: string) {
  if (style === "mapbox" && mapboxToken) {
    return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/${zoom}/${x}/${y}@2x?access_token=${mapboxToken}`;
  }

  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

function currencyDistance(meters?: number) {
  if (!meters) return "-";
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function durationLabel(seconds?: number) {
  if (!seconds) return "-";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function PropertyDashboard({
  properties,
  mapProvider,
  mapboxToken,
  canRoute,
}: {
  properties: PropertyDashboardRecord[];
  mapProvider: MapStyle;
  mapboxToken?: string;
  canRoute: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyle>(mapProvider === "mapbox" && mapboxToken ? "mapbox" : "osm");
  const [selectedId, setSelectedId] = useState<string | null>(properties[0]?.id ?? null);
  const [detailProperty, setDetailProperty] = useState<PropertyDashboardRecord | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const mappableProperties = useMemo(() => properties.filter(isMappable), [properties]);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return properties.filter((property) => {
      if (status === "active" && !property.is_active) return false;
      if (status === "inactive" && property.is_active) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        property.property_name,
        property.street_1,
        property.street_2,
        property.city,
        property.state,
        property.postal_code,
        getClientName(property),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [properties, query, status]);

  const selectedProperty = properties.find((property) => property.id === selectedId) ?? filteredProperties[0] ?? null;
  const center = useMemo(() => {
    if (selectedProperty && isMappable(selectedProperty)) {
      return { latitude: selectedProperty.latitude, longitude: selectedProperty.longitude };
    }

    if (mappableProperties.length > 0) {
      const total = mappableProperties.reduce(
        (sum, property) => ({
          latitude: sum.latitude + (property.latitude ?? 0),
          longitude: sum.longitude + (property.longitude ?? 0),
        }),
        { latitude: 0, longitude: 0 },
      );

      return {
        latitude: total.latitude / mappableProperties.length,
        longitude: total.longitude / mappableProperties.length,
      };
    }

    return fallbackCenter;
  }, [mappableProperties, selectedProperty]);

  const zoom = mappableProperties.length > 12 ? 10 : 11;
  const centerTileX = lonToTileX(center.longitude, zoom);
  const centerTileY = latToTileY(center.latitude, zoom);
  const baseTileX = Math.floor(centerTileX) - 2;
  const baseTileY = Math.floor(centerTileY) - 1;
  const tileOffsetX = (baseTileX - centerTileX) * tileSize + 480;
  const tileOffsetY = (baseTileY - centerTileY) * tileSize + 260;

  const visibleTiles = Array.from({ length: 15 }, (_, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    return {
      key: `${baseTileX + col}-${baseTileY + row}`,
      x: baseTileX + col,
      y: baseTileY + row,
      left: tileOffsetX + col * tileSize,
      top: tileOffsetY + row * tileSize,
    };
  });

  const routePath = useMemo(() => {
    if (!routeResult?.route.length) return "";

    return routeResult.route
      .map((coordinate, index) => {
        const point = projectPoint(coordinate, center, zoom);
        return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      })
      .join(" ");
  }, [center, routeResult, zoom]);

  const mapStops = useMemo(
    () =>
      mappableProperties.map((property) => ({
        id: property.id,
        label: property.property_name ?? getClientName(property),
        address: formatAddress(property),
        latitude: property.latitude,
        longitude: property.longitude,
      })),
    [mappableProperties],
  );

  const orderedNavigationStops = routeResult?.orderedStops?.length ? routeResult.orderedStops : mapStops;
  const navigationLinks = buildExternalNavigationLinks({ stops: orderedNavigationStops });

  async function createRoute() {
    setRouteError(null);
    setRouteResult(null);

    const coordinates = filteredProperties
      .filter(isMappable)
      .slice(0, 12)
      .map((property) => ({
        id: property.id,
        label: property.property_name ?? getClientName(property),
        address: formatAddress(property),
        latitude: property.latitude ?? 0,
        longitude: property.longitude ?? 0,
      }));

    if (coordinates.length < 2) {
      setRouteError("Add coordinates to at least two filtered properties before routing.");
      return;
    }

    setIsRouting(true);

    try {
      const response = await fetch("/api/properties/route-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: coordinates }),
      });

      const result = (await response.json()) as RouteResult | { error?: string };

      if (!response.ok || "error" in result) {
        setRouteError("error" in result ? result.error ?? "Route generation failed." : "Route generation failed.");
        return;
      }

      setRouteResult(result as RouteResult);
    } catch {
      setRouteError("Route generation failed.");
    } finally {
      setIsRouting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 p-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Property map</h2>
              <p className="mt-1 text-xs text-zinc-500">OpenStreetMap is preserved; Mapbox GL renders when configured.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMapStyle("osm")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  mapStyle === "osm" ? "border-[#287b40] bg-emerald-100 text-zinc-950" : "border-emerald-200 bg-white text-zinc-800"
                }`}
              >
                OSM
              </button>
              <button
                type="button"
                onClick={() => setMapStyle("mapbox")}
                disabled={!mapboxToken}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  mapStyle === "mapbox" ? "border-[#287b40] bg-emerald-100 text-zinc-950" : "border-emerald-200 bg-white text-zinc-800"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Mapbox
              </button>
              <button
                type="button"
                onClick={createRoute}
                disabled={!canRoute || isRouting}
                className="rounded-full bg-[#287b40] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isRouting ? "Optimizing..." : "Optimize route"}
              </button>
            </div>
          </div>

          <div className="relative h-[520px] min-h-[520px] overflow-hidden bg-[#dbe8dc]">
            {mapStyle === "mapbox" && mapboxToken ? (
              <MapboxRouteMap
                accessToken={mapboxToken}
                center={center}
                stops={mapStops}
                route={routeResult?.geometry ?? null}
                activeStopId={selectedProperty?.id ?? null}
              />
            ) : (
              <>
                {visibleTiles.map((tile) => (
                  // External map tiles are deliberately rendered as raw images; Next image optimization is not useful for XYZ tiles.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={tile.key}
                    alt=""
                    src={tileUrl(mapStyle, tile.x, tile.y, zoom, mapboxToken)}
                    className="absolute h-64 w-64 select-none"
                    draggable={false}
                    style={{ left: tile.left, top: tile.top }}
                  />
                ))}

                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {routePath ? <path d={routePath} fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="0.55" /> : null}
                </svg>

                {mappableProperties.map((property) => {
                  const point = projectPoint(
                    { latitude: property.latitude, longitude: property.longitude },
                    center,
                    zoom,
                  );
                  const isSelected = selectedProperty?.id === property.id;

                  return (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => setSelectedId(property.id)}
                      className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md ${
                        isSelected ? "border-zinc-950 bg-zinc-950 text-white" : "border-white bg-emerald-600 text-white"
                      }`}
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      title={formatAddress(property)}
                    >
                      {isSelected ? "•" : ""}
                    </button>
                  );
                })}
              </>
            )}

            {mappableProperties.length === 0 ? (
              <div className="absolute inset-4 flex items-center justify-center rounded-2xl border border-emerald-200 bg-white/90 p-6 text-center">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">No mapped properties yet</p>
                  <p className="mt-1 text-sm text-zinc-600">Add latitude and longitude to properties to unlock map markers and ORS routing.</p>
                </div>
              </div>
            ) : null}

            <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-600 shadow-sm">
              <span>Tiles © OpenStreetMap contributors</span>
              {mapStyle === "mapbox" ? <span> · Mapbox</span> : null}
            </div>
          </div>

          {routeResult?.summary || routeError ? (
            <div className="border-t border-emerald-100 p-3 text-sm">
              {routeError ? (
                <p className="font-semibold text-amber-700">{routeError}</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-800">
                    {routeResult?.provider === "mapbox" ? "Mapbox optimized route" : "Route"}:{" "}
                    {currencyDistance(routeResult?.summary?.distance)} · {durationLabel(routeResult?.summary?.duration)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {navigationLinks.googleMapsUrl ? (
                      <a
                        href={navigationLinks.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-emerald-50"
                      >
                        Google Maps
                      </a>
                    ) : null}
                    {navigationLinks.nextStopAppleMapsUrl ? (
                      <a
                        href={navigationLinks.nextStopAppleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-emerald-50"
                      >
                        Apple next stop
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Selected property</h2>
          {selectedProperty ? (
            <div className="mt-3 space-y-3">
              <div>
                <button
                  type="button"
                  onClick={() => setDetailProperty(selectedProperty)}
                  className="min-h-11 text-left text-lg font-semibold text-zinc-950 underline decoration-emerald-600 underline-offset-4"
                >
                  {selectedProperty.property_name || formatAddress(selectedProperty)}
                </button>
                <p className="mt-1 text-sm text-zinc-600">{formatAddress(selectedProperty)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-600">{getClientName(selectedProperty)}</span>
                <StatusPill status={selectedProperty.is_active ? "active" : "inactive"} />
              </div>
              <p className="rounded-lg border border-emerald-100 bg-[#f9fcf9] px-3 py-2 text-sm text-zinc-700">
                {selectedProperty.service_notes || selectedProperty.access_notes || "No property notes yet."}
              </p>
              {isMappable(selectedProperty) ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selectedProperty.latitude}&mlon=${selectedProperty.longitude}#map=17/${selectedProperty.latitude}/${selectedProperty.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-emerald-200 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-emerald-50"
                >
                  Open in OpenStreetMap
                </a>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  This property needs coordinates.
                </p>
              )}
            </div>
          ) : (
            <EmptyState title="No property selected" />
          )}
        </aside>
      </section>

      <section className="rounded-2xl border border-emerald-200/80 bg-white p-3 shadow-sm md:p-4">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Property drill-down</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Showing {filteredProperties.length} of {properties.length} properties.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px] lg:min-w-[520px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search address, contact, or city"
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <EmptyState title="No properties found" description="Adjust the search or status filter." />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {filteredProperties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => setDetailProperty(property)}
                  className="block w-full text-left"
                >
                  <PropertyCard
                    property={{
                      address: formatAddress(property),
                      clientName: getClientName(property),
                      accessNotes: property.access_notes,
                      propertyNotes: property.service_notes,
                      status: property.is_active ? "completed" : "paused",
                    }}
                    variant="compact"
                  />
                </button>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Address</Th>
                    <Th>Client</Th>
                    <Th>Status</Th>
                    <Th>Map</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((property) => (
                    <tr key={property.id} className="border-t border-zinc-200">
                      <Td>
                        <button
                          type="button"
                          onClick={() => setDetailProperty(property)}
                          className="min-h-11 text-left font-semibold text-zinc-950 underline decoration-emerald-600 underline-offset-4"
                        >
                          {formatAddress(property)}
                        </button>
                      </Td>
                      <Td>{getClientName(property)}</Td>
                      <Td>
                        <StatusPill status={property.is_active ? "active" : "inactive"} />
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setSelectedId(property.id)}
                          className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-emerald-50"
                        >
                          {isMappable(property) ? "Focus" : "Needs coords"}
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </section>

      <BottomSheetDialog
        open={Boolean(detailProperty)}
        onClose={() => setDetailProperty(null)}
        eyebrow="Property"
        title={detailProperty ? detailProperty.property_name || formatAddress(detailProperty) : "Property"}
      >
        {detailProperty ? (
          <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
            <PropertyCard
              property={{
                address: formatAddress(detailProperty),
                clientName: getClientName(detailProperty),
                accessNotes: detailProperty.access_notes,
                propertyNotes: detailProperty.service_notes,
                status: detailProperty.is_active ? "completed" : "paused",
              }}
              variant="expanded"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(detailProperty.id);
                  setDetailProperty(null);
                }}
                className="min-h-11 rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-50"
              >
                Focus on map
              </button>
              {isMappable(detailProperty) ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${detailProperty.latitude}&mlon=${detailProperty.longitude}#map=17/${detailProperty.latitude}/${detailProperty.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#287b40] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#236d38]"
                >
                  Open map
                </a>
              ) : (
                <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
                  Coordinates are missing.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </BottomSheetDialog>
    </div>
  );
}
