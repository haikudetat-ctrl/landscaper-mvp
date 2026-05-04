import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAppEvent, transitionServiceVisitState } from "@/lib/db/events";
import type { Json } from "@/lib/types/database";
import type { Tables } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export async function listServiceVisits(params?: {
  fromDate?: string;
  toDate?: string;
  status?: string;
  includeMissedBacklogForDate?: string;
}) {
  const supabase = createSupabaseServerClient();

  const selectColumns =
    "id, property_id, service_plan_id, service_type_id, scheduled_date, scheduled_position, status, reactivation_required, quoted_price, operator_notes, skip_reason, completion_timestamp, properties(id, street_1, city, state, postal_code, client_id, clients(id, full_name, primary_phone)), service_types(id, label)";

  if (params?.includeMissedBacklogForDate) {
    const backlogResult = await supabase.rpc("list_today_visits_with_missed_backlog", {
      p_target_date: params.includeMissedBacklogForDate,
      p_status: params.status,
    });

    throwDbError(backlogResult.error, "Failed to load today's backlog visits");

    const backlogRows = backlogResult.data ?? [];
    if (backlogRows.length === 0) {
      return [];
    }

    const visitIds = backlogRows.map((row) => row.service_visit_id);
    const sortById = new Map(backlogRows.map((row) => [row.service_visit_id, row.sort_rank]));
    const missedById = new Map(backlogRows.map((row) => [row.service_visit_id, row.is_missed_appointment]));

    const visitResult = await supabase
      .from("service_visits")
      .select(selectColumns)
      .in("id", visitIds)
      .limit(300);

    throwDbError(visitResult.error, "Failed to load visit details for backlog");

    const detailedRows = visitResult.data ?? [];
    const detailedById = new Map(detailedRows.map((row) => [row.id, row]));

    return backlogRows
      .map((row) => {
        const detail = detailedById.get(row.service_visit_id);
        if (!detail) return null;
        return {
          ...detail,
          is_missed_appointment: missedById.get(row.service_visit_id) ?? false,
          backlog_sort_rank: sortById.get(row.service_visit_id) ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => a.backlog_sort_rank - b.backlog_sort_rank);
  }

  let query = supabase
    .from("service_visits")
    .select(selectColumns)
    .order("scheduled_date", { ascending: true });

  if (params?.fromDate) {
    query = query.gte("scheduled_date", params.fromDate);
  }

  if (params?.toDate) {
    query = query.lte("scheduled_date", params.toDate);
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const result = await query.limit(200);
  throwDbError(result.error, "Failed to load service visits");

  return result.data ?? [];
}

export async function getServiceVisitById(id: string) {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("service_visits")
    .select(
      "id, property_id, service_plan_id, service_type_id, scheduled_date, status, completion_timestamp, completion_notes, operator_notes, skip_reason, quoted_price, reactivation_required, was_rain_delayed, rain_delay_source_date, invoice_status, properties(id, street_1, street_2, city, state, postal_code, service_notes, access_notes, gate_notes, clients(id, full_name, primary_phone, primary_email)), service_types(id, label), service_plans(id, plan_name, frequency_type, status)",
    )
    .eq("id", id)
    .single();

  throwDbError(result.error, "Failed to load visit");
  if (!result.data) {
    throw new Error("Visit not found");
  }
  return result.data;
}

export async function getInvoiceByServiceVisitId(serviceVisitId: string) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("invoices")
    .select("id, invoice_number, status, due_date, amount_due")
    .eq("service_visit_id", serviceVisitId)
    .maybeSingle();

  throwDbError(result.error, "Failed to load visit invoice");
  return result.data;
}

export async function updateServiceVisit(id: string, input: Partial<Tables<"service_visits">>) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("service_visits")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  throwDbError(result.error, "Failed to update visit");
  if (!result.data) {
    throw new Error("Visit update returned no record");
  }
  return result.data;
}

export async function markVisitCompleted(id: string) {
  const transition = await transitionServiceVisitState({
    visitId: id,
    eventType: "visit_completed",
  });

  return transition?.[0]?.service_visit as Tables<"service_visits">;
}

export async function markVisitSkipped(id: string, reason: string, note: string | null) {
  const transition = await transitionServiceVisitState({
    visitId: id,
    eventType: "visit_skipped",
    payload: {
      reason,
      note,
    },
  });

  return transition?.[0]?.service_visit as Tables<"service_visits">;
}

export async function markVisitPendingReactivation(id: string) {
  const updated = await updateServiceVisit(id, {
    status: "pending_reactivation",
    reactivation_required: true,
    completion_timestamp: null,
  });

  await recordAppEvent({
    entityType: "service_visit",
    entityId: id,
    eventType: "visit_needs_review",
    nextState: updated as unknown as Json,
    payload: {
      reason: "Pending reactivation",
    },
  });

  return updated;
}

export async function rescheduleVisit(id: string, scheduledDate: string, note: string | null) {
  const transition = await transitionServiceVisitState({
    visitId: id,
    eventType: "visit_rescheduled",
    scheduledDate,
    payload: {
      note,
      scheduled_date: scheduledDate,
    },
  });

  return transition?.[0]?.service_visit as Tables<"service_visits">;
}

export async function bulkRainDelayShift(fromDate: string, reason: string) {
  const supabase = createSupabaseServerClient();

  const result = await supabase.rpc("bulk_rain_delay_shift", {
    p_source_date: fromDate,
    p_notes: reason,
  });

  throwDbError(result.error, "Failed rain-delay shift");
  return result.data;
}

export async function listSkippedPendingReactivation() {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("v_skipped_visits_pending_reactivation")
    .select("*")
    .order("scheduled_date", { ascending: true });

  throwDbError(result.error, "Failed to load pending reactivation visits");
  return result.data ?? [];
}
