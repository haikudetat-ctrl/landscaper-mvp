"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

import type { MapCoordinate, MapStop } from "@/lib/maps/types";

type MapboxRouteMapProps = {
  accessToken: string;
  center: MapCoordinate;
  stops: MapStop[];
  route?: GeoJSON.LineString | null;
  activeStopId?: string | null;
};

export function MapboxRouteMap({ accessToken, center, stops, route, activeStopId }: MapboxRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = accessToken;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [center.longitude, center.latitude],
      zoom: stops.length > 12 ? 10 : 11,
      attributionControl: true,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [accessToken, center.latitude, center.longitude, stops.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ center: [center.longitude, center.latitude], duration: 350 });
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = stops.map((stop, index) => {
      const markerEl = document.createElement("button");
      markerEl.type = "button";
      markerEl.title = stop.address ?? stop.label ?? `Stop ${index + 1}`;
      markerEl.className = [
        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md",
        stop.id === activeStopId ? "border-zinc-950 bg-zinc-950 text-white" : "border-white bg-emerald-600 text-white",
      ].join(" ");
      markerEl.textContent = `${index + 1}`;

      return new mapboxgl.Marker({ element: markerEl, anchor: "center" })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map);
    });

    if (stops.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach((stop) => bounds.extend([stop.longitude, stop.latitude]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 350 });
    }
  }, [activeStopId, stops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateRoute = () => {
      const source = map.getSource("saved-route") as mapboxgl.GeoJSONSource | undefined;
      const data: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: route ?? { type: "LineString", coordinates: [] },
      };

      if (source) {
        source.setData(data);
        return;
      }

      map.addSource("saved-route", { type: "geojson", data });
      map.addLayer({
        id: "saved-route-line",
        type: "line",
        source: "saved-route",
        paint: {
          "line-color": "#111827",
          "line-width": 4,
          "line-opacity": 0.82,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once("load", updateRoute);
    }
  }, [route]);

  return <div ref={containerRef} className="h-full min-h-[520px] w-full" />;
}
