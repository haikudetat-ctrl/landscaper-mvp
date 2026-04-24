import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts, Tables } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export async function listProperties(search?: string) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("properties")
    .select("id, client_id, property_name, street_1, street_2, city, state, postal_code, is_active, service_notes, access_notes, clients(id, full_name, primary_email, primary_phone)")
    .order("street_1", { ascending: true });

  if (search && search.trim()) {
    query = query.or(
      `street_1.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%,postal_code.ilike.%${search}%`,
    );
  }

  const result = await query;
  throwDbError(result.error, "Failed to load properties");
  return result.data ?? [];
}

export async function getPropertyById(id: string) {
  const supabase = createSupabaseServerClient();

  const [
    propertyResult,
    servicePlansResult,
    upcomingVisitsResult,
    recentInvoicesResult,
    clientsResult,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id, client_id, property_name, street_1, street_2, city, state, postal_code, is_active, gate_notes, access_notes, service_notes, clients(id, full_name, primary_email, primary_phone)")
      .eq("id", id)
      .single(),
    supabase
      .from("service_plans")
      .select("id, property_id, service_type_id, plan_name, frequency_type, status, quoted_price, start_date, end_date, notes, service_types(id, label)")
      .eq("property_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_visits")
      .select("id, property_id, service_type_id, scheduled_date, status, quoted_price, service_types(id, label)")
      .eq("property_id", id)
      .gte("scheduled_date", new Date().toISOString().slice(0, 10))
      .order("scheduled_date", { ascending: true })
      .limit(12),
    supabase
      .from("v_invoice_balances")
      .select("*")
      .eq("property_id", id)
      .order("due_date", { ascending: false })
      .limit(10),
    supabase.from("clients").select("id, full_name").order("created_at", {
      ascending: false,
    }),
  ]);

  throwDbError(propertyResult.error, "Failed to load property");
  throwDbError(servicePlansResult.error, "Failed to load property service plans");
  throwDbError(upcomingVisitsResult.error, "Failed to load upcoming property visits");
  throwDbError(recentInvoicesResult.error, "Failed to load property invoices");
  throwDbError(clientsResult.error, "Failed to load clients for property form");

  if (!propertyResult.data) {
    throw new Error("Property not found");
  }

  return {
    property: propertyResult.data,
    servicePlans: servicePlansResult.data ?? [],
    upcomingVisits: upcomingVisitsResult.data ?? [],
    recentInvoices: recentInvoicesResult.data ?? [],
    clients: clientsResult.data ?? [],
  };
}

export async function listClientOptions() {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("clients")
    .select("id, full_name")
    .order("created_at", { ascending: false });

  throwDbError(result.error, "Failed to load client options");
  return result.data ?? [];
}

export async function createProperty(input: Inserts<"properties">): Promise<Tables<"properties">> {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("properties").insert(input).select("*").single();

  throwDbError(result.error, "Failed to create property");
  if (!result.data) {
    throw new Error("Property creation returned no record");
  }
  return result.data;
}

export async function updateProperty(id: string, input: Partial<Inserts<"properties">>) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("properties")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  throwDbError(result.error, "Failed to update property");
  if (!result.data) {
    throw new Error("Property update returned no record");
  }
  return result.data;
}
