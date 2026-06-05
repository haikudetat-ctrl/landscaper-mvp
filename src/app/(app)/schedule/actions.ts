"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { getCurrentUserMembership } from "@/lib/db/auth";
import { rescheduleVisit } from "@/lib/db/service-visits";
import {
  createTodayRouteFromScheduledVisits,
  moveRouteStop,
  markRouteCompleted,
  markRouteStarted,
  reorderRouteStops,
} from "@/lib/db/routes";
import { logEvent } from "@/lib/db/operational-events";
import { throwDbError } from "@/lib/db/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithActionError(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected action failure";
  redirect(`${path}?status=error&message=${encodeURIComponent(message)}`);
}

export async function quickRescheduleAction(visitId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.serviceVisitsWrite);
    const date = String(formData.get("scheduledDate") ?? "").trim();
    if (!date) throw new Error("A new date is required.");
    await rescheduleVisit(visitId, date, "Quick reschedule from schedule page.");
    revalidatePath("/schedule");
    revalidatePath("/today");
    redirect("/schedule?status=visit_rescheduled");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function createVisitAction(formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.serviceVisitsWrite);
    const supabase = createSupabaseServerClient();
    const { user, membership } = await getCurrentUserMembership();
    if (!membership) throw new Error("Organization membership required.");

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "").trim();
  const servicePlanId = String(formData.get("servicePlanId") ?? "").trim() || null;
  const scheduledDate = String(formData.get("scheduledDate") ?? "").trim();
  const quotedPrice = Number(formData.get("quotedPrice") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();

  if (!propertyId || !serviceTypeId || !scheduledDate) {
    throw new Error("Property, service type, and scheduled date are required.");
  }

  const propertyResult = await supabase
    .from("properties")
    .select("id, organization_id")
    .eq("id", propertyId)
    .single();
  throwDbError(propertyResult.error, "Failed to load property context");
  if (!propertyResult.data) throw new Error("Property not found");

  const createResult = await supabase
    .from("service_visits")
    .insert({
      organization_id: membership.organization_id,
      property_id: propertyId,
      service_plan_id: servicePlanId,
      service_type_id: serviceTypeId,
      scheduled_date: scheduledDate,
      status: "scheduled",
      quoted_price: Number.isFinite(quotedPrice) ? Math.max(0, quotedPrice) : 0,
      operator_notes: notes || null,
    })
    .select("id")
    .single();
  throwDbError(createResult.error, "Failed to create service visit");
  const visitRow = createResult.data as { id: string } | null;
  if (!visitRow) throw new Error("Service visit creation returned no id");

  await logEvent({
    organizationId: membership.organization_id,
    actorUserId: user?.id ?? null,
    entityType: "service_visit",
    entityId: visitRow.id,
    eventType: "visit_scheduled",
    metadata: {
      source: "schedule_page",
      scheduled_date: scheduledDate,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/today");
    redirect("/schedule?status=visit_created");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function createTodayRouteAction() {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    await createTodayRouteFromScheduledVisits();
    revalidatePath("/schedule");
    revalidatePath("/today");
    redirect("/schedule?status=route_created");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function startRouteAction(routeId: string) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    await markRouteStarted(routeId);
    revalidatePath("/schedule");
    revalidatePath("/today");
    redirect("/schedule?status=route_started");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function completeRouteAction(routeId: string) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    await markRouteCompleted(routeId);
    revalidatePath("/schedule");
    revalidatePath("/today");
    redirect("/schedule?status=route_completed");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function reorderRouteAction(routeId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    const orderedVisitIds = String(formData.get("orderedVisitIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
    await reorderRouteStops({
      routeId,
      orderedStopIds: orderedVisitIds,
    });
    revalidatePath("/schedule");
    revalidatePath("/today");
    redirect("/schedule?status=route_reordered");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function moveRouteStopUpAction(routeId: string, stopId: string) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    await moveRouteStop({
      routeId,
      stopId,
      direction: "up",
    });
    revalidatePath("/schedule");
    revalidatePath("/today");
    redirect("/schedule?status=route_reordered");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function moveRouteStopDownAction(routeId: string, stopId: string) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    await moveRouteStop({
      routeId,
      stopId,
      direction: "down",
    });
    revalidatePath("/schedule");
    revalidatePath("/today");
    redirect("/schedule?status=route_reordered");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}

export async function bulkWeatherDelayAction(formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.serviceVisitsWrite);
    const supabase = createSupabaseServerClient();
    const { user, membership } = await getCurrentUserMembership();
    if (!membership) throw new Error("Organization membership required.");

  const newDate = String(formData.get("newDate") ?? "").trim();
  const visitIds = String(formData.get("visitIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!newDate || !visitIds.length) throw new Error("New date and at least one visit are required.");

  const currentVisitsResult = await supabase
    .from("service_visits")
    .select("id, scheduled_date, status")
    .in("id", visitIds);
  throwDbError(currentVisitsResult.error, "Failed to load visits for weather delay");
  const currentVisits = currentVisitsResult.data ?? [];

  const updateResult = await supabase
    .from("service_visits")
    .update({
      status: "delayed_weather",
      scheduled_date: newDate,
      updated_at: new Date().toISOString(),
      was_rain_delayed: true,
    })
    .in("id", visitIds);
  throwDbError(updateResult.error, "Failed to apply weather delay");

  for (const visit of currentVisits) {
    await logEvent({
      organizationId: membership.organization_id,
      actorUserId: user?.id ?? null,
      entityType: "service_visit",
      entityId: visit.id,
      eventType: "weather_delay_applied",
      previousState: {
        status: visit.status,
        scheduled_date: visit.scheduled_date,
      },
      newState: {
        status: "delayed_weather",
        scheduled_date: newDate,
      },
      metadata: {
        previous_scheduled_at: null,
        previous_scheduled_date: visit.scheduled_date,
      },
    });

    await logEvent({
      organizationId: membership.organization_id,
      actorUserId: user?.id ?? null,
      entityType: "service_visit",
      entityId: visit.id,
      eventType: "visit_rescheduled",
      metadata: {
        previous_scheduled_at: null,
        previous_scheduled_date: visit.scheduled_date,
        new_scheduled_date: newDate,
        source: "bulk_weather_delay",
      },
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/today");
    redirect("/schedule?status=weather_delay_applied");
  } catch (error) {
    redirectWithActionError("/schedule", error);
  }
}
