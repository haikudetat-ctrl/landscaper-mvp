import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Views } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export type DailyRunVisit = {
  service_visit_id: string | null;
  property_id: string | null;
  service_plan_id: string | null;
  service_type_id: string | null;
  scheduled_date: string | null;
  scheduled_position: number | null;
  visit_status: string | null;
  quoted_price: number | null;
  operator_notes: string | null;
  completion_notes: string | null;
  client_id: string | null;
  client_name: string | null;
  primary_phone: string | null;
  primary_email: string | null;
  property_name: string | null;
  street_1: string | null;
  street_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  service_notes: string | null;
  access_notes: string | null;
  gate_notes: string | null;
  plan_name: string | null;
  frequency_type: string | null;
  service_type_code: string | null;
  service_type_label: string | null;
  was_rain_delayed: boolean | null;
  rain_delay_source_date: string | null;
  is_missed_appointment: boolean;
  photo_count: number;
};

export type CollectionInvoice = Views<"v_invoice_balances">;

export type YesterdaySummary = {
  date: string;
  completedVisits: number;
  skippedVisits: number;
  revenueCompleted: number;
  pendingCollectionsCount: number;
  pendingCollectionsAmount: number;
  notableIssues: Array<{
    id: string;
    clientName: string | null;
    address: string;
    reason: string;
  }>;
};

export type DailyRunData = {
  today: string;
  yesterday: YesterdaySummary;
  visits: DailyRunVisit[];
  collections: CollectionInvoice[];
  photosAttachedToday: number;
};

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addressFromParts(row: { street_1?: string | null; city?: string | null; state?: string | null; postal_code?: string | null }) {
  return [row.street_1, [row.city, row.state, row.postal_code].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" • ");
}

export async function getDailyRunData(): Promise<DailyRunData> {
  const supabase = createSupabaseServerClient();
  const today = localDate();
  const yesterday = localDate(-1);

  const [
    backlogResult,
    yesterdayVisitsResult,
    collectionsResult,
  ] = await Promise.all([
    supabase.rpc("list_today_visits_with_missed_backlog", {
      p_target_date: today,
    }),
    supabase
      .from("service_visits")
      .select(
        "id, status, quoted_price, skip_reason, operator_notes, properties(street_1, city, state, postal_code, clients(full_name))",
      )
      .eq("scheduled_date", yesterday)
      .limit(300),
    supabase
      .from("v_invoice_balances")
      .select("*")
      .gt("amount_remaining", 0)
      .order("due_date", { ascending: true })
      .limit(25),
  ]);

  throwDbError(backlogResult.error, "Failed to load today's run list");
  throwDbError(yesterdayVisitsResult.error, "Failed to load yesterday summary");
  throwDbError(collectionsResult.error, "Failed to load collections");

  const backlogRows = backlogResult.data ?? [];
  let visits: DailyRunVisit[] = [];

  if (backlogRows.length > 0) {
    const visitIds = backlogRows.map((row) => row.service_visit_id);
    const sortById = new Map(backlogRows.map((row) => [row.service_visit_id, row.sort_rank]));
    const missedById = new Map(backlogRows.map((row) => [row.service_visit_id, row.is_missed_appointment]));

    const [visitResult, photoCountResult] = await Promise.all([
      supabase
        .from("service_visits")
        .select(
          "id, property_id, service_plan_id, service_type_id, scheduled_date, scheduled_position, status, quoted_price, operator_notes, completion_notes, was_rain_delayed, rain_delay_source_date, properties(id, street_1, street_2, city, state, postal_code, property_name, service_notes, access_notes, gate_notes, latitude, longitude, client_id, clients(id, full_name, primary_phone, primary_email)), service_types(id, code, label), service_plans(id, plan_name, frequency_type)",
        )
        .in("id", visitIds)
        .limit(300),
      supabase
        .from("visit_photos")
        .select("service_visit_id")
        .in("service_visit_id", visitIds)
        .limit(1000),
    ]);

    throwDbError(visitResult.error, "Failed to load run visit details");
    throwDbError(photoCountResult.error, "Failed to load run photo counts");

    const photoCounts = new Map<string, number>();
    for (const photo of photoCountResult.data ?? []) {
      photoCounts.set(photo.service_visit_id, (photoCounts.get(photo.service_visit_id) ?? 0) + 1);
    }

    visits = (visitResult.data ?? [])
      .filter((visit) => visit.status !== "pending_reactivation")
      .map((visit) => {
        const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
        const client = property?.clients
          ? Array.isArray(property.clients)
            ? property.clients[0]
            : property.clients
          : null;
        const serviceType = Array.isArray(visit.service_types) ? visit.service_types[0] : visit.service_types;
        const servicePlan = Array.isArray(visit.service_plans) ? visit.service_plans[0] : visit.service_plans;

        return {
          service_visit_id: visit.id,
          property_id: visit.property_id,
          service_plan_id: visit.service_plan_id,
          service_type_id: visit.service_type_id,
          scheduled_date: visit.scheduled_date,
          scheduled_position: visit.scheduled_position,
          visit_status: visit.status,
          quoted_price: visit.quoted_price,
          operator_notes: visit.operator_notes,
          completion_notes: visit.completion_notes,
          client_id: property?.client_id ?? null,
          client_name: client?.full_name ?? null,
          primary_phone: client?.primary_phone ?? null,
          primary_email: client?.primary_email ?? null,
          property_name: property?.property_name ?? null,
          street_1: property?.street_1 ?? null,
          street_2: property?.street_2 ?? null,
          city: property?.city ?? null,
          state: property?.state ?? null,
          postal_code: property?.postal_code ?? null,
          latitude: property?.latitude ?? null,
          longitude: property?.longitude ?? null,
          service_notes: property?.service_notes ?? null,
          access_notes: property?.access_notes ?? null,
          gate_notes: property?.gate_notes ?? null,
          plan_name: servicePlan?.plan_name ?? null,
          frequency_type: servicePlan?.frequency_type ?? null,
          service_type_code: serviceType?.code ?? null,
          service_type_label: serviceType?.label ?? null,
          was_rain_delayed: visit.was_rain_delayed,
          rain_delay_source_date: visit.rain_delay_source_date,
          is_missed_appointment: missedById.get(visit.id) ?? false,
          photo_count: photoCounts.get(visit.id) ?? 0,
        };
      })
      .sort((a, b) => {
        const left = a.service_visit_id ? (sortById.get(a.service_visit_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        const right = b.service_visit_id ? (sortById.get(b.service_visit_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        return left - right;
      });
  }

  const yesterdayVisits = yesterdayVisitsResult.data ?? [];
  const completedVisits = yesterdayVisits.filter((visit) => visit.status === "completed");
  const skippedVisits = yesterdayVisits.filter((visit) => visit.status === "skipped");
  const collections = collectionsResult.data ?? [];
  const pendingCollectionsAmount = collections.reduce((sum, invoice) => sum + (invoice.amount_remaining ?? 0), 0);

  return {
    today,
    yesterday: {
      date: yesterday,
      completedVisits: completedVisits.length,
      skippedVisits: skippedVisits.length,
      revenueCompleted: completedVisits.reduce((sum, visit) => sum + (visit.quoted_price ?? 0), 0),
      pendingCollectionsCount: collections.length,
      pendingCollectionsAmount,
      notableIssues: skippedVisits.slice(0, 4).map((visit) => {
        const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
        const client = property?.clients
          ? Array.isArray(property.clients)
            ? property.clients[0]
            : property.clients
          : null;

        return {
          id: visit.id,
          clientName: client?.full_name ?? null,
          address: addressFromParts(property ?? {}),
          reason: visit.skip_reason ?? visit.operator_notes ?? "Skipped visit",
        };
      }),
    },
    visits,
    collections,
    photosAttachedToday: visits.reduce((sum, visit) => sum + visit.photo_count, 0),
  };
}
