import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { bulkRainDelayShift } from "@/lib/db/service-visits";

type RequestBody = {
  sourceDate?: string;
  reason?: string;
};

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.scheduleShift);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: RequestBody;

  try {
    payload = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceDate = payload.sourceDate?.trim() ?? "";
  if (!isValidDateString(sourceDate)) {
    return NextResponse.json({ error: "sourceDate must be YYYY-MM-DD" }, { status: 400 });
  }

  const reason = payload.reason?.trim() || "Weather day skip";

  try {
    const shiftedCount = await bulkRainDelayShift(sourceDate, reason);
    return NextResponse.json({ shiftedCount: shiftedCount ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed rain-delay shift";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
