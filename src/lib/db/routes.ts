import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/db/operational-events";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function getTodayRoute() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const today = localDate();
  const routeResult = await supabase
    .from("routes")
    .select("id, organization_id, route_date, status, started_at, completed_at, notes")
    .eq("organization_id", orgId)
    .eq("route_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwDbError(routeResult.error, "Failed to load today's route");
  return routeResult.data as
    | {
        id: string;
        organization_id: string;
        route_date: string;
        status: string;
        started_at: string | null;
        completed_at: string | null;
        notes: string | null;
      }
    | null;
}

export async function getTodayRouteStops() {
  const supabase = createSupabaseServerClient();
  const route = await getTodayRoute();
  if (!route) {
    return { route: null, stops: [] as Array<{
      id: string;
      stop_order: number;
      status: string;
      service_visit_id: string | null;
      service_visits: {
        id: string;
        status: string;
        scheduled_position: number | null;
        properties: {
          street_1: string | null;
          city: string | null;
          state: string | null;
          clients: { full_name: string } | null;
        } | null;
      } | null;
    }> };
  }
  const stopsResult = await supabase
    .from("route_stops")
    .select(
      "id, stop_order, status, service_visit_id, service_visits(id, status, scheduled_position, properties(street_1, city, state, clients(full_name)))",
    )
    .eq("route_id", route.id)
    .eq("organization_id", route.organization_id)
    .order("stop_order", { ascending: true });
  throwDbError(stopsResult.error, "Failed to load route stops");
  return {
    route,
    stops: (stopsResult.data ?? []) as Array<{
      id: string;
      stop_order: number;
      status: string;
      service_visit_id: string | null;
      service_visits: {
        id: string;
        status: string;
        scheduled_position: number | null;
        properties: {
          street_1: string | null;
          city: string | null;
          state: string | null;
          clients: { full_name: string } | null;
        } | null;
      } | null;
    }>,
  };
}

async function writeRouteSnapshot(input: {
  organizationId: string;
  routeId: string;
  eventType: string;
  originalOrder: string[];
  newOrder: string[];
  changedBy: string | null;
}) {
  const supabase = createSupabaseServerClient();
  await supabase.from("route_snapshots").insert({
    organization_id: input.organizationId,
    route_id: input.routeId,
    event_type: input.eventType,
    original_order: input.originalOrder,
    new_order: input.newOrder,
    changed_by: input.changedBy,
    changed_at: new Date().toISOString(),
  });
}

export async function createTodayRouteFromScheduledVisits() {
  const supabase = createSupabaseServerClient();
  const { orgId, userId } = await requireOrgContext();

  const existing = await getTodayRoute();
  if (existing) return existing.id;

  const today = localDate();
  const visitsResult = await supabase
    .from("service_visits")
    .select("id, scheduled_position")
    .eq("organization_id", orgId)
    .eq("scheduled_date", today)
    .not("status", "in", "(cancelled,canceled,completed)")
    .order("scheduled_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  throwDbError(visitsResult.error, "Failed to load visits for route creation");
  const visits = visitsResult.data ?? [];

  const routeResult = await supabase
    .from("routes")
    .insert({
      organization_id: orgId,
      route_date: today,
      status: "planned",
      notes: "Auto-created from today's scheduled visits.",
    })
    .select("id, organization_id")
    .single();
  throwDbError(routeResult.error, "Failed to create route");
  const route = routeResult.data as { id: string; organization_id: string } | null;
  if (!route) throw new Error("Route creation returned no id");

  if (visits.length) {
    const stops = visits.map((visit, index) => ({
      organization_id: orgId,
      route_id: route.id,
      service_visit_id: visit.id,
      stop_order: index + 1,
      status: "pending",
    }));
    const stopsResult = await supabase.from("route_stops").insert(stops);
    throwDbError(stopsResult.error, "Failed to create route stops");
  }

  const orderedIds = visits.map((visit) => visit.id);
  await logEvent({
    organizationId: orgId,
    actorUserId: userId,
    entityType: "route",
    entityId: route.id,
    eventType: "route_created",
    metadata: {
      visit_ids: orderedIds,
      stop_count: orderedIds.length,
    },
  });

  await writeRouteSnapshot({
    organizationId: orgId,
    routeId: route.id,
    eventType: "route_created",
    originalOrder: [],
    newOrder: orderedIds,
    changedBy: userId,
  });

  return route.id;
}

export async function reorderRouteStops(input: { routeId: string; orderedStopIds: string[] }) {
  const supabase = createSupabaseServerClient();
  const { orgId, userId } = await requireOrgContext();
  if (!input.orderedStopIds.length) throw new Error("No stops provided for reorder.");

  const existingResult = await supabase
    .from("route_stops")
    .select("id, service_visit_id, stop_order")
    .eq("route_id", input.routeId)
    .eq("organization_id", orgId)
    .order("stop_order", { ascending: true });
  throwDbError(existingResult.error, "Failed to load route stops");
  const existing = (existingResult.data ?? []) as Array<{
    id: string;
    service_visit_id: string | null;
    stop_order: number;
  }>;
  const originalOrder = existing.map((stop) => stop.service_visit_id).filter(Boolean) as string[];

  const stopByVisitId = new Map(existing.map((stop) => [stop.service_visit_id, stop]));
  const orderedStops = input.orderedStopIds
    .filter((visitId, index, visitIds) => visitIds.indexOf(visitId) === index)
    .map((visitId) => stopByVisitId.get(visitId))
    .filter(Boolean) as typeof existing;
  const orderedStopIds = new Set(orderedStops.map((stop) => stop.id));
  const finalStops = orderedStops.concat(existing.filter((stop) => !orderedStopIds.has(stop.id)));
  const finalOrder = finalStops.map((stop) => stop.service_visit_id).filter(Boolean) as string[];
  const temporaryOrderOffset = Math.max(...existing.map((stop) => stop.stop_order), 0) + existing.length + 1000;

  for (const [index, stop] of finalStops.entries()) {
    const updateResult = await supabase
      .from("route_stops")
      .update({ stop_order: temporaryOrderOffset + index })
      .eq("id", stop.id)
      .eq("route_id", input.routeId)
      .eq("organization_id", orgId);
    throwDbError(updateResult.error, "Failed to stage route stop order");
  }

  for (const [index, stop] of finalStops.entries()) {
    const updateResult = await supabase
      .from("route_stops")
      .update({ stop_order: index + 1 })
      .eq("id", stop.id)
      .eq("route_id", input.routeId)
      .eq("organization_id", orgId);
    throwDbError(updateResult.error, "Failed to update route stop order");
  }

  await logEvent({
    organizationId: orgId,
    actorUserId: userId,
    entityType: "route",
    entityId: input.routeId,
    eventType: "route_reordered",
    metadata: {
      original_order: originalOrder,
      new_order: finalOrder,
    },
  });

  await writeRouteSnapshot({
    organizationId: orgId,
    routeId: input.routeId,
    eventType: "route_reordered",
    originalOrder,
    newOrder: finalOrder,
    changedBy: userId,
  });
}

export async function moveRouteStop(input: { routeId: string; stopId: string; direction: "up" | "down" }) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const stopsResult = await supabase
    .from("route_stops")
    .select("id, stop_order, service_visit_id")
    .eq("route_id", input.routeId)
    .eq("organization_id", orgId)
    .order("stop_order", { ascending: true });
  throwDbError(stopsResult.error, "Failed to load route stops for move");
  const stops = (stopsResult.data ?? []) as Array<{ id: string; stop_order: number; service_visit_id: string | null }>;
  const index = stops.findIndex((stop) => stop.id === input.stopId);
  if (index < 0) return;
  const swapWith = input.direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= stops.length) return;

  const next = [...stops];
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  const orderedVisitIds = next.map((stop) => stop.service_visit_id).filter(Boolean) as string[];
  await reorderRouteStops({
    routeId: input.routeId,
    orderedStopIds: orderedVisitIds,
  });
}

export async function markRouteStarted(routeId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId, userId } = await requireOrgContext();

  const updateResult = await supabase
    .from("routes")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", routeId)
    .eq("organization_id", orgId)
    .select("id")
    .single();
  throwDbError(updateResult.error, "Failed to mark route started");

  await logEvent({
    organizationId: orgId,
    actorUserId: userId,
    entityType: "route",
    entityId: routeId,
    eventType: "route_started",
  });
}

export async function markRouteCompleted(routeId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId, userId } = await requireOrgContext();

  const updateResult = await supabase
    .from("routes")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", routeId)
    .eq("organization_id", orgId)
    .select("id")
    .single();
  throwDbError(updateResult.error, "Failed to mark route completed");

  await logEvent({
    organizationId: orgId,
    actorUserId: userId,
    entityType: "route",
    entityId: routeId,
    eventType: "route_completed",
  });
}
