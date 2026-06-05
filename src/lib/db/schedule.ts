import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export function isoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekBounds(referenceDate: Date): { weekStart: string; weekEnd: string } {
  const start = new Date(referenceDate);
  const day = start.getDay();
  const offset = (day + 6) % 7;
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { weekStart: isoDate(start), weekEnd: isoDate(end) };
}

export async function listScheduleVisits(input: { fromDate: string; toDate: string }) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  type ScheduleVisitRow = {
    id: string;
    organization_id: string;
    property_id: string | null;
    service_plan_id: string | null;
    service_type_id: string | null;
    scheduled_date: string;
    scheduled_at: string | null;
    scheduled_position: number | null;
    status: string;
    quoted_price: number;
    operator_notes: string | null;
    properties: {
      id: string;
      street_1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      clients: { id: string; full_name: string } | null;
    } | null;
    service_types: { id: string; label: string } | null;
  };
  const result = await supabase
    .from("service_visits")
    .select(
      "id, organization_id, property_id, service_plan_id, service_type_id, scheduled_date, scheduled_at, scheduled_position, status, quoted_price, operator_notes, properties(id, street_1, city, state, postal_code, clients(id, full_name)), service_types(id, label)",
    )
    .eq("organization_id", orgId)
    .gte("scheduled_date", input.fromDate)
    .lte("scheduled_date", input.toDate)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("scheduled_position", { ascending: true, nullsFirst: false })
    .limit(400);

  throwDbError(result.error, "Failed to load schedule visits");
  return (result.data ?? []) as ScheduleVisitRow[];
}

export async function listScheduleFormOptions() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const [propertiesResult, serviceTypesResult, servicePlansResult] = await Promise.all([
    supabase
      .from("properties")
      .select("id, street_1, city, state, postal_code, client_id, clients(id, full_name)")
      .eq("organization_id", orgId)
      .order("street_1", { ascending: true }),
    supabase.from("service_types").select("id, label").order("label", { ascending: true }),
    supabase
      .from("service_plans")
      .select("id, plan_name, property_id")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("plan_name", { ascending: true }),
  ]);

  throwDbError(propertiesResult.error, "Failed to load schedule property options");
  throwDbError(serviceTypesResult.error, "Failed to load schedule service options");
  throwDbError(servicePlansResult.error, "Failed to load schedule plan options");

  return {
    properties: propertiesResult.data ?? [],
    serviceTypes: serviceTypesResult.data ?? [],
    servicePlans: servicePlansResult.data ?? [],
  };
}
