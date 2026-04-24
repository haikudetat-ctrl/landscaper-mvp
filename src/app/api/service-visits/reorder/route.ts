import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReorderRow = {
  visitId: string;
  scheduledPosition: number;
};

type RequestBody = {
  orders?: ReorderRow[];
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  let payload: RequestBody;

  try {
    payload = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orders = payload.orders ?? [];

  if (orders.length === 0) {
    return NextResponse.json({ error: "orders are required" }, { status: 400 });
  }

  if (orders.length > 300) {
    return NextResponse.json({ error: "Too many rows in one reorder request" }, { status: 400 });
  }

  for (const row of orders) {
    if (!isUuid(row.visitId)) {
      return NextResponse.json({ error: "visitId must be a valid UUID" }, { status: 400 });
    }
    if (!Number.isInteger(row.scheduledPosition) || row.scheduledPosition < 1) {
      return NextResponse.json({ error: "scheduledPosition must be an integer >= 1" }, { status: 400 });
    }
  }

  const supabase = createSupabaseServerClient();

  try {
    await Promise.all(
      orders.map(async (row) => {
        const result = await supabase
          .from("service_visits")
          .update({ scheduled_position: row.scheduledPosition })
          .eq("id", row.visitId);

        if (result.error) {
          throw result.error;
        }
      }),
    );

    return NextResponse.json({ updated: orders.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save visit order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
