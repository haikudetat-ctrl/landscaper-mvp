import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts, Tables } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export async function listServicePlans() {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("service_plans")
    .select("id, property_id, service_type_id, plan_name, frequency_type, interval_count, day_of_week, start_date, end_date, quoted_price, status, notes, properties(id, street_1, city, state, postal_code), service_types(id, label)")
    .order("created_at", { ascending: false });

  throwDbError(result.error, "Failed to load service plans");
  return result.data ?? [];
}

export async function getServicePlanById(id: string) {
  const supabase = createSupabaseServerClient();

  const [planResult, propertiesResult, serviceTypesResult] = await Promise.all([
    supabase
      .from("service_plans")
      .select("id, property_id, service_type_id, plan_name, frequency_type, interval_count, day_of_week, start_date, end_date, quoted_price, status, notes, auto_generate_visits, billing_mode, season_start_month, season_end_month, preferred_service_window, properties(id, street_1, city, state, postal_code), service_types(id, label)")
      .eq("id", id)
      .single(),
    supabase
      .from("properties")
      .select("id, street_1, city, state, postal_code")
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

  const [propertiesResult, serviceTypesResult] = await Promise.all([
    supabase
      .from("properties")
      .select("id, street_1, city, state, postal_code")
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
  const result = await supabase.from("service_plans").insert(input).select("*").single();

  throwDbError(result.error, "Failed to create service plan");
  if (!result.data) {
    throw new Error("Service plan creation returned no record");
  }
  return result.data;
}

export async function updateServicePlan(id: string, input: Partial<Inserts<"service_plans">>) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("service_plans")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  throwDbError(result.error, "Failed to update service plan");
  if (!result.data) {
    throw new Error("Service plan update returned no record");
  }
  return result.data;
}

export async function generateVisitsForPlan(planId: string, startDate: string, endDate: string) {
  const supabase = createSupabaseServerClient();

  const result = await supabase.rpc("generate_service_visits_for_plan", {
    p_service_plan_id: planId,
    p_window_start: startDate,
    p_window_end: endDate,
  });

  throwDbError(result.error, "Failed to generate visits for plan");
  return result.data;
}

export async function generateVisitsForActivePlans(startDate: string, endDate: string) {
  const supabase = createSupabaseServerClient();

  const result = await supabase.rpc("generate_service_visits_for_active_plans", {
    p_window_start: startDate,
    p_window_end: endDate,
  });

  throwDbError(result.error, "Failed to generate visits");
  return result.data;
}
