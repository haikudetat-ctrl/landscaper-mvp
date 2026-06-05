import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/db/operational-events";
import {
  generateNextVisitFromCompletedVisit,
  type RecurringVisitGenerationResult,
} from "@/lib/db/recurring-visits";
import type { Tables } from "@/lib/types/database";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export async function listServiceVisits(params?: {
  fromDate?: string;
  toDate?: string;
  status?: string;
  includeMissedBacklogForDate?: string;
}) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

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
      .eq("organization_id", orgId)
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
    .eq("organization_id", orgId)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_position", { ascending: true, nullsFirst: false });

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
  const { orgId } = await requireOrgContext();

  const result = await supabase
    .from("service_visits")
    .select(
      "id, property_id, service_plan_id, service_type_id, scheduled_date, status, completion_timestamp, completion_notes, operator_notes, skip_reason, quoted_price, reactivation_required, was_rain_delayed, rain_delay_source_date, invoice_status, properties(id, street_1, street_2, city, state, postal_code, service_notes, access_notes, gate_notes, clients(id, full_name, primary_phone, primary_email)), service_types(id, label), service_plans(id, plan_name, frequency_type, status)",
    )
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  throwDbError(result.error, "Failed to load visit");
  if (!result.data) {
    throw new Error("Visit not found");
  }
  return result.data;
}

export async function getGeneratedNextVisitForVisit(id: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase
    .from("service_visits")
    .select("id, scheduled_date, status, generation_reason, service_types(id, label)")
    .eq("generated_from_visit_id", id)
    .eq("organization_id", orgId)
    .eq("generation_reason", "recurring_completion")
    .not("status", "in", "(cancelled,canceled,skipped)")
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  throwDbError(result.error, "Failed to load generated next visit");
  return result.data;
}

export async function getInvoiceByServiceVisitId(serviceVisitId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase
    .from("invoices")
    .select("id, invoice_number, status, due_date, amount_due")
    .eq("service_visit_id", serviceVisitId)
    .eq("organization_id", orgId)
    .maybeSingle();

  throwDbError(result.error, "Failed to load visit invoice");
  return result.data;
}

export async function updateServiceVisit(id: string, input: Partial<Tables<"service_visits">>, organizationId?: string) {
  const supabase = createSupabaseServerClient();
  const orgId = organizationId ?? (await requireOrgContext()).orgId;
  const result = await supabase
    .from("service_visits")
    .update(input)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("*")
    .single();

  throwDbError(result.error, "Failed to update visit");
  if (!result.data) {
    throw new Error("Visit update returned no record");
  }
  return result.data;
}

export async function markVisitCompleted(
  id: string,
  options?: {
    organizationId?: string;
    actorUserId?: string | null;
    completionNotes?: string | null;
  },
): Promise<{
  visit: Tables<"service_visits">;
  recurrence: RecurringVisitGenerationResult | null;
  recurrenceError: string | null;
}> {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const currentResult = await supabase
    .from("service_visits")
    .select("id, organization_id, status")
    .eq("id", id)
    .eq("organization_id", options?.organizationId ?? orgId)
    .single();
  throwDbError(currentResult.error, "Failed to load visit before completion");

  const now = new Date().toISOString();
  const updated = await updateServiceVisit(
    id,
    {
      status: "completed",
      completion_timestamp: now,
      completed_at: now,
      ...(options?.completionNotes ? { completion_notes: options.completionNotes } : {}),
    },
    options?.organizationId ?? orgId,
  );

  await logEvent({
    organizationId: (currentResult.data as { organization_id: string }).organization_id,
    actorUserId: options?.actorUserId,
    entityType: "service_visit",
    entityId: id,
    eventType: "visit_completed",
    previousState: { status: (currentResult.data as { status: string }).status },
    newState: { status: "completed" },
    metadata: options?.completionNotes ? { note: options.completionNotes } : {},
  });

  let recurrence: RecurringVisitGenerationResult | null = null;
  let recurrenceError: string | null = null;

  try {
    recurrence = await generateNextVisitFromCompletedVisit({
      organizationId: options?.organizationId ?? (currentResult.data as { organization_id: string }).organization_id,
      completedVisitId: id,
      actorUserId: options?.actorUserId,
    });
  } catch (error) {
    recurrenceError = error instanceof Error ? error.message : "Recurring generation failed.";
    await logEvent({
      organizationId: (currentResult.data as { organization_id: string }).organization_id,
      actorUserId: options?.actorUserId,
      entityType: "service_visit",
      entityId: id,
      eventType: "recurring_visit_generation_failed",
      metadata: {
        completed_visit_id: id,
        error: recurrenceError,
      },
    });
  }

  return { visit: updated, recurrence, recurrenceError };
}

export async function markVisitSkipped(id: string, reason: string, note: string | null) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const currentResult = await supabase
    .from("service_visits")
    .select("id, organization_id, status")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  throwDbError(currentResult.error, "Failed to load visit before skip");

  const updated = await updateServiceVisit(
    id,
    {
      status: "skipped",
      skip_reason: reason || "Skipped",
    },
    orgId,
  );

  await logEvent({
    organizationId: (currentResult.data as { organization_id: string }).organization_id,
    entityType: "service_visit",
    entityId: id,
    eventType: "visit_skipped",
    previousState: { status: (currentResult.data as { status: string }).status },
    newState: { status: "skipped" },
    metadata: {
      reason,
      note,
    },
  });

  return updated;
}

export async function markVisitPendingReactivation(id: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const currentResult = await supabase
    .from("service_visits")
    .select("id, organization_id, status")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  throwDbError(currentResult.error, "Failed to load visit before reactivation flag");

  const updated = await updateServiceVisit(
    id,
    {
      status: "pending_reactivation",
      reactivation_required: true,
      completion_timestamp: null,
    },
    orgId,
  );

  await logEvent({
    organizationId: (currentResult.data as { organization_id: string }).organization_id,
    entityType: "service_visit",
    entityId: id,
    eventType: "visit_needs_review",
    previousState: { status: (currentResult.data as { status: string }).status },
    newState: { status: "pending_reactivation" },
    metadata: {
      reason: "Pending reactivation",
    },
  });

  return updated;
}

export async function rescheduleVisit(id: string, scheduledDate: string, note: string | null) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const currentResult = await supabase
    .from("service_visits")
    .select("id, organization_id, status, scheduled_date")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  throwDbError(currentResult.error, "Failed to load visit before reschedule");

  const updated = await updateServiceVisit(
    id,
    {
      scheduled_date: scheduledDate,
      scheduled_at: `${scheduledDate}T09:00:00Z`,
      status: "rescheduled",
    },
    orgId,
  );

  const current = currentResult.data as { organization_id: string; status: string; scheduled_date: string | null };
  await logEvent({
    organizationId: current.organization_id,
    entityType: "service_visit",
    entityId: id,
    eventType: "visit_rescheduled",
    previousState: { status: current.status, scheduled_date: current.scheduled_date },
    newState: { status: "rescheduled", scheduled_date: scheduledDate },
    metadata: {
      note,
      scheduled_date: scheduledDate,
    },
  });

  return updated;
}

export async function bulkRainDelayShift(fromDate: string, reason: string) {
  const supabase = createSupabaseServerClient();
  await requireOrgContext();

  const result = await supabase.rpc("bulk_rain_delay_shift", {
    p_source_date: fromDate,
    p_notes: reason,
  });

  throwDbError(result.error, "Failed rain-delay shift");
  return result.data;
}

export async function listSkippedPendingReactivation() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const result = await supabase
    .from("v_skipped_visits_pending_reactivation")
    .select("*")
    .eq("organization_id", orgId)
    .order("scheduled_date", { ascending: true });

  throwDbError(result.error, "Failed to load pending reactivation visits");
  return result.data ?? [];
}
