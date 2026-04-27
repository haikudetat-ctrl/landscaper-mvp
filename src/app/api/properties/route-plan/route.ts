import { NextResponse } from "next/server";
import { z } from "zod";

const routePlanSchema = z.object({
  coordinates: z
    .array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .min(2)
    .max(25),
});

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouteService API key is not configured." }, { status: 501 });
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

  const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: parsed.data.coordinates.map((coordinate) => [coordinate.longitude, coordinate.latitude]),
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "OpenRouteService could not generate a route." }, { status: response.status });
  }

  const data = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: number[][] };
      properties?: { summary?: { distance?: number; duration?: number } };
    }>;
  };

  const feature = data.features?.[0];
  const coordinates = feature?.geometry?.coordinates;

  if (!coordinates) {
    return NextResponse.json({ error: "OpenRouteService returned no route geometry." }, { status: 502 });
  }

  return NextResponse.json({
    route: coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    summary: feature.properties?.summary ?? null,
  });
}
