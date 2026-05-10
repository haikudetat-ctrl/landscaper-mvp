import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { getConfiguredMapProvider } from "@/lib/maps";
import type { MapStop } from "@/lib/maps/types";

const coordinateSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const routePlanSchema = z.object({
  coordinates: z.array(coordinateSchema).min(2).max(25).optional(),
  start: coordinateSchema.optional(),
  stops: z.array(coordinateSchema).min(1).max(25).optional(),
  end: coordinateSchema.optional(),
});

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSIONS.runView);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Route payload is invalid." }, { status: 400 });
  }

  const parsed = routePlanSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Route payload is invalid." }, { status: 400 });
  }

  const coordinates = parsed.data.coordinates;
  const stops = parsed.data.stops ?? coordinates;

  if (!stops?.length) {
    return NextResponse.json({ error: "At least one route stop is required." }, { status: 400 });
  }

  const provider = getConfiguredMapProvider();
  const toStop = (coordinate: z.infer<typeof coordinateSchema>, index: number): MapStop => ({
    id: coordinate.id ?? `stop-${index + 1}`,
    label: coordinate.label,
    address: coordinate.address,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  });

  try {
    const optimizedRoute = await provider.optimizeRoute({
      start: parsed.data.start ? toStop(parsed.data.start, 0) : undefined,
      stops: stops.map(toStop),
      end: parsed.data.end ? toStop(parsed.data.end, stops.length + 1) : undefined,
    });

    return NextResponse.json({
      provider: optimizedRoute.provider,
      orderedStops: optimizedRoute.orderedStops,
      route: optimizedRoute.route,
      geometry: optimizedRoute.geometry,
      summary: {
        distance: optimizedRoute.distance ?? undefined,
        duration: optimizedRoute.duration ?? undefined,
      },
      providerMetadata: optimizedRoute.providerMetadata,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate route." },
      { status: provider.name === "mapbox" && !process.env.MAPBOX_ACCESS_TOKEN ? 501 : 502 },
    );
  }
}
