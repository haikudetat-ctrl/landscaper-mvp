import { NextResponse } from "next/server";
import { z } from "zod";

import { getConfiguredMapProvider } from "@/lib/maps";

const geocodeSchema = z.object({
  address: z.string().trim().min(1),
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Geocode payload is invalid." }, { status: 400 });
  }

  const parsed = geocodeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Address is required." }, { status: 400 });
  }

  const provider = getConfiguredMapProvider();

  try {
    // Call this endpoint only after address entry settles or from an explicit geocode action.
    // Mapbox autocomplete/geocoding can bill per keystroke when used aggressively.
    const result = await provider.geocodeAddress(parsed.data.address);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to geocode address." },
      { status: provider.name === "mapbox" && !process.env.MAPBOX_ACCESS_TOKEN ? 501 : 502 },
    );
  }
}
