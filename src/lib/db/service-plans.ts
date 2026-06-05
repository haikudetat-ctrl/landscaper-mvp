import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts, Tables } from "@/lib/types/database";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export async function listServicePlans() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const result = await supabase
    .from("service_plans")
    .select("id, property_id, service_type_id, plan_name, frequency_type, interval_count, day_of_week, start_date, end_date, quoted_price, status, notes, properties(id, street_1, city, state, postal_code), service_types(id, label)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  throwDbError(result.error, "Failed to load service plans");
  return result.data ?? [];
}

export async function getServicePlanById(id: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const [planResult, propertiesResult, serviceTypesResult] = await Promise.all([
    supabase
      .from("service_plans")
      .select("id, property_id, service_type_id, plan_name, frequency_type, interval_count, day_of_week, start_date, end_date, quoted_price, status, notes, auto_generate_visits, billing_mode, season_start_month, season_end_month, preferred_service_window, properties(id, street_1, city, state, postal_code), service_types(id, label)")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single(),
    supabase
      .from("properties")
      .select("id, street_1, city, state, postal_code")
      .eq("organization_id", orgId)
      .order("street_1", { ascending: true }),
    supabase.from("service_types").select("id, label").order("label", { ascending: true }),
  ]);

  throwDbError(planResult.error, "Failed to load service plan");
  throwDbError(propertiesResult.error, "Failed to load property options");
  throwDbError(serviceTypesResult.error, "Failed to load service type options");

  if (!planResult.data) {
    throw new Error("Service plan not found");
  }

  return {
    plan: planResult.data,
    properties: propertiesResult.data ?? [],
    serviceTypes: serviceTypesResult.data ?? [],
  };
}

export async function getServicePlanFormOptions() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const [propertiesResult, serviceTypesResult] = await Promise.all([
    supabase
      .from("properties")
      .select("id, street_1, city, state, postal_code")
      .eq("organization_id", orgId)
      .order("street_1", { ascending: true }),
    supabase.from("service_types").select("id, label").order("label", { ascending: true }),
  ]);

  throwDbError(propertiesResult.error, "Failed to load property options");
  throwDbError(serviceTypesResult.error, "Failed to load service type options");

  return {
    properties: propertiesResult.data ?? [],
    serviceTypes: serviceTypesResult.data ?? [],
  };
}

export async function createServicePlan(input: Inserts<"service_plans">): Promise<Tables<"service_plans">> {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase.from("service_plans").insert({ ...input, organization_id: orgId }).select("*").single();

  throwDbError(result.error, "Failed to create service plan");
  if (!result.data) {
    throw new Error("Service plan creation returned no record");
  }
  return result.data;
}

export async function updateServicePlan(id: string, input: Partial<Inserts<"service_plans">>, organizationId?: string) {
  const supabase = createSupabaseServerClient();
  const orgId = organizationId ?? (await requireOrgContext()).orgId;
  const result = await supabase
    .from("service_plans")
    .update(input)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("*")
    .single();

  throwDbError(result.error, "Failed to update service plan");
  if (!result.data) {
    throw new Error("Service plan update returned no record");
  }
  return result.data;
}

export async function generateVisitsForPlan(planId: string, startDate: string, endDate: string, organizationId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  if (orgId !== organizationId) {
    throw new Error("Organization mismatch for service visit generation.");
  }
  const planResult = await supabase
    .from("service_plans")
    .select("id, organization_id, property_id, service_type_id, quoted_price, frequency_type, interval_count, day_of_week, start_date, end_date")
    .eq("id", planId)
    .eq("organization_id", organizationId)
    .single();

  throwDbError(planResult.error, "Failed to load service plan before visit generation");
  if (!planResult.data) {
    throw new Error("Service plan not found.");
  }

  const result = await supabase.rpc("generate_service_visits_for_plan", {
    p_service_plan_id: planId,
    p_window_start: startDate,
    p_window_end: endDate,
  });

  if (result.error?.message?.includes(`null value in column "organization_id" of relation "service_visits"`)) {
    return generateVisitsForPlanFallback({
      supabase,
      plan: planResult.data,
      startDate,
      endDate,
      organizationId,
    });
  }

  throwDbError(result.error, "Failed to generate visits for plan");
  return result.data;
}

export async function generateVisitsForActivePlans(startDate: string, endDate: string, organizationId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  if (orgId !== organizationId) {
    throw new Error("Organization mismatch for active service visit generation.");
  }

  const plansResult = await supabase
    .from("service_plans")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  throwDbError(plansResult.error, "Failed to load active service plans for visit generation");

  const summaries = [];
  for (const plan of plansResult.data ?? []) {
    const insertedCount = await generateVisitsForPlan(plan.id, startDate, endDate, organizationId);
    summaries.push({
      service_plan_id: plan.id,
      inserted_count: typeof insertedCount === "number" ? insertedCount : 0,
    });
  }

  return summaries;
}

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function addMonths(date: Date, months: number) {
  const out = new Date(date);
  out.setMonth(out.getMonth() + months);
  return out;
}

function matchesWeekday(date: Date, dayOfWeek: number | null) {
  if (dayOfWeek == null) return true;
  return date.getDay() === dayOfWeek;
}

async function generateVisitsForPlanFallback(input: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  plan: {
    id: string;
    organization_id: string | null;
    property_id: string;
    service_type_id: string;
    quoted_price: number;
    frequency_type: string;
    interval_count: number | null;
    day_of_week: number | null;
    start_date: string;
    end_date: string | null;
  };
  startDate: string;
  endDate: string;
  organizationId: string;
}) {
  const plan = input.plan;
  const orgId = plan.organization_id ?? input.organizationId;
  const windowStart = toDateOnly(input.startDate);
  const windowEnd = toDateOnly(input.endDate);
  const planStart = toDateOnly(plan.start_date);
  const planEnd = plan.end_date ? toDateOnly(plan.end_date) : null;
  const effectiveStart = windowStart > planStart ? windowStart : planStart;
  const effectiveEnd = planEnd && planEnd < windowEnd ? planEnd : windowEnd;

  if (effectiveStart > effectiveEnd) return 0;

  const existingResult = await input.supabase
    .from("service_visits")
    .select("scheduled_date")
    .eq("organization_id", orgId)
    .eq("service_plan_id", plan.id)
    .gte("scheduled_date", toDateString(effectiveStart))
    .lte("scheduled_date", toDateString(effectiveEnd));
  throwDbError(existingResult.error, "Failed to load existing visits for fallback generation");
  const existing = new Set((existingResult.data ?? []).map((row) => row.scheduled_date));

  const generatedDates: string[] = [];
  const frequency = plan.frequency_type;
  const intervalDays = Math.max(1, plan.interval_count ?? (frequency === "biweekly" ? 14 : 7));

  if (frequency === "monthly") {
    let cursor = new Date(planStart);
    while (cursor <= effectiveEnd) {
      if (cursor >= effectiveStart && matchesWeekday(cursor, plan.day_of_week)) {
        generatedDates.push(toDateString(cursor));
      }
      cursor = addMonths(cursor, 1);
    }
  } else if (frequency === "custom_interval" || frequency === "biweekly" || frequency === "weekly") {
    let cursor = new Date(planStart);
    while (cursor <= effectiveEnd) {
      if (cursor >= effectiveStart && matchesWeekday(cursor, plan.day_of_week)) {
        generatedDates.push(toDateString(cursor));
      }
      cursor = addDays(cursor, intervalDays);
    }
  } else {
    let cursor = new Date(effectiveStart);
    while (cursor <= effectiveEnd) {
      if (matchesWeekday(cursor, plan.day_of_week)) {
        generatedDates.push(toDateString(cursor));
      }
      cursor = addDays(cursor, 7);
    }
  }

  const inserts = generatedDates
    .filter((date) => !existing.has(date))
    .map((scheduledDate) => ({
      organization_id: orgId,
      property_id: plan.property_id,
      service_plan_id: plan.id,
      service_type_id: plan.service_type_id,
      scheduled_date: scheduledDate,
      quoted_price: plan.quoted_price,
      status: "scheduled",
    }));

  if (inserts.length === 0) return 0;

  const insertResult = await input.supabase.from("service_visits").insert(inserts);
  throwDbError(insertResult.error, "Failed to generate visits for plan (fallback)");
  return inserts.length;
}
