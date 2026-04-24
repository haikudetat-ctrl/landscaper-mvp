import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export async function listServiceVisits(params?: { fromDate?: string; toDate?: string; status?: string }) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("service_visits")
    .select(
      "id, property_id, service_plan_id, service_type_id, scheduled_date, status, reactivation_required, quoted_price, operator_notes, skip_reason, completion_timestamp, properties(id, street_1, city, state, postal_code, client_id, clients(id, full_name, primary_phone)), service_types(id, label)",
    )
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
  return updateServiceVisit(id, {
    status: "completed",
    completion_timestamp: new Date().toISOString(),
    skip_reason: null,
    reactivation_required: false,
  });
}

export async function markVisitSkipped(id: string, reason: string, note: string | null) {
  return updateServiceVisit(id, {
    status: "skipped",
    skip_reason: reason,
    operator_notes: note,
    completion_timestamp: null,
    reactivation_required: true,
  });
}

export async function markVisitPendingReactivation(id: string) {
  return updateServiceVisit(id, {
    reactivation_required: true,
  });
}

export async function rescheduleVisit(id: string, scheduledDate: string, note: string | null) {
  return updateServiceVisit(id, {
    scheduled_date: scheduledDate,
    status: "rescheduled",
    operator_notes: note,
    reactivation_required: false,
  });
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
