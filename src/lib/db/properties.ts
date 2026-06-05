import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts, Tables } from "@/lib/types/database";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export async function listProperties(search?: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  let query = supabase
    .from("properties")
    .select("id, client_id, property_name, street_1, street_2, city, state, postal_code, latitude, longitude, is_active, service_notes, access_notes, clients(id, full_name, primary_email, primary_phone)")
    .eq("organization_id", orgId)
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
  const { orgId } = await requireOrgContext();

  const [
    propertyResult,
    servicePlansResult,
    upcomingVisitsResult,
    recentInvoicesResult,
    clientsResult,
    serviceHistoryResult,
    issuesResult,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id, client_id, property_name, street_1, street_2, city, state, postal_code, is_active, gate_notes, access_notes, service_notes, clients(id, full_name, primary_email, primary_phone)")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single(),
    supabase
      .from("service_plans")
      .select("id, property_id, service_type_id, plan_name, frequency_type, status, quoted_price, start_date, end_date, notes, service_types(id, label)")
      .eq("organization_id", orgId)
      .eq("property_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_visits")
      .select("id, property_id, service_type_id, scheduled_date, status, quoted_price, service_types(id, label)")
      .eq("organization_id", orgId)
      .eq("property_id", id)
      .gte("scheduled_date", new Date().toISOString().slice(0, 10))
      .order("scheduled_date", { ascending: true })
      .limit(12),
    supabase
      .from("v_invoice_balances")
      .select("*")
      .eq("organization_id", orgId)
      .eq("property_id", id)
      .order("due_date", { ascending: false })
      .limit(10),
    supabase.from("clients").select("id, full_name").eq("organization_id", orgId).order("created_at", {
      ascending: false,
    }),
    supabase
      .from("service_visits")
      .select("id, scheduled_date, status, quoted_price")
      .eq("organization_id", orgId)
      .eq("property_id", id)
      .order("scheduled_date", { ascending: false })
      .limit(20),
    supabase
      .from("issues")
      .select("id, title, severity, status, created_at, service_visit_id")
      .eq("organization_id", orgId)
      .eq("property_id", id)
      .in("status", ["open", "acknowledged", "customer_notified", "resolved"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  throwDbError(propertyResult.error, "Failed to load property");
  throwDbError(servicePlansResult.error, "Failed to load property service plans");
  throwDbError(upcomingVisitsResult.error, "Failed to load upcoming property visits");
  throwDbError(recentInvoicesResult.error, "Failed to load property invoices");
  throwDbError(clientsResult.error, "Failed to load clients for property form");
  throwDbError(serviceHistoryResult.error, "Failed to load property service history");
  throwDbError(issuesResult.error, "Failed to load property issues");

  if (!propertyResult.data) {
    throw new Error("Property not found");
  }

  return {
    property: propertyResult.data,
    servicePlans: servicePlansResult.data ?? [],
    upcomingVisits: upcomingVisitsResult.data ?? [],
    recentInvoices: recentInvoicesResult.data ?? [],
    clients: clientsResult.data ?? [],
    serviceHistory: serviceHistoryResult.data ?? [],
    openIssues: (issuesResult.data ?? []) as Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      created_at: string;
      service_visit_id: string | null;
    }>,
  };
}

export async function listClientOptions() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  throwDbError(result.error, "Failed to load client options");
  return result.data ?? [];
}

export async function createProperty(input: Inserts<"properties">): Promise<Tables<"properties">> {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase.from("properties").insert({ ...input, organization_id: orgId }).select("*").single();

  throwDbError(result.error, "Failed to create property");
  if (!result.data) {
    throw new Error("Property creation returned no record");
  }
  return result.data;
}

export async function updateProperty(id: string, input: Partial<Inserts<"properties">>, organizationId?: string) {
  const supabase = createSupabaseServerClient();
  const orgId = organizationId ?? (await requireOrgContext()).orgId;
  const query = supabase.from("properties").update(input).eq("id", id).eq("organization_id", orgId);
  const result = await query.select("*").single();

  throwDbError(result.error, "Failed to update property");
  if (!result.data) {
    throw new Error("Property update returned no record");
  }
  return result.data;
}
