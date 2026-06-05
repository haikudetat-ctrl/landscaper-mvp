import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts, Tables } from "@/lib/types/database";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export async function listClients(search?: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  let query = supabase.from("clients").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });

  if (search && search.trim()) {
    query = query.or(
      `full_name.ilike.%${search}%,primary_email.ilike.%${search}%,primary_phone.ilike.%${search}%`,
    );
  }

  const result = await query;
  throwDbError(result.error, "Failed to load clients");
  return result.data ?? [];
}

export async function getClientById(id: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase.from("clients").select("*").eq("id", id).eq("organization_id", orgId).single();

  throwDbError(result.error, "Failed to load client");
  if (!result.data) {
    throw new Error("Client not found");
  }
  return result.data;
}

export async function getClientDetail(id: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const [clientResult, propertiesResult, invoicesResult, issuesResult] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).eq("organization_id", orgId).single(),
    supabase
      .from("properties")
      .select("*")
      .eq("organization_id", orgId)
      .eq("client_id", id)
      .order("street_1", { ascending: true }),
    supabase
      .from("v_invoice_balances")
      .select("*")
      .eq("organization_id", orgId)
      .eq("client_id", id)
      .order("due_date", { ascending: false }),
    supabase
      .from("issues")
      .select("id, title, severity, status, created_at, service_visit_id")
      .eq("organization_id", orgId)
      .eq("client_id", id)
      .in("status", ["open", "acknowledged", "customer_notified", "resolved"])
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  throwDbError(clientResult.error, "Failed to load client detail");
  throwDbError(propertiesResult.error, "Failed to load client properties");
  throwDbError(invoicesResult.error, "Failed to load client invoices");
  throwDbError(issuesResult.error, "Failed to load client issues");

  if (!clientResult.data) {
    throw new Error("Client not found");
  }

  const propertyIds = (propertiesResult.data ?? []).map((property) => property.id);
  const serviceHistoryResult = propertyIds.length
    ? await supabase
        .from("service_visits")
        .select("id, scheduled_date, status, quoted_price, properties(street_1, city, state, postal_code)")
        .eq("organization_id", orgId)
        .in("property_id", propertyIds)
        .order("scheduled_date", { ascending: false })
        .limit(12)
    : { data: [], error: null };
  throwDbError(serviceHistoryResult.error, "Failed to load client service history");

  return {
    client: clientResult.data,
    properties: propertiesResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    serviceHistory: serviceHistoryResult.data ?? [],
    issues: (issuesResult.data ?? []) as Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      created_at: string;
      service_visit_id: string | null;
    }>,
  };
}

export async function createClient(input: Inserts<"clients">): Promise<Tables<"clients">> {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase.from("clients").insert({ ...input, organization_id: orgId }).select("*").single();

  throwDbError(result.error, "Failed to create client");
  if (!result.data) {
    throw new Error("Client creation returned no record");
  }
  return result.data;
}

export async function updateClient(id: string, input: Partial<Inserts<"clients">>, organizationId?: string) {
  const supabase = createSupabaseServerClient();
  const orgId = organizationId ?? (await requireOrgContext()).orgId;
  const query = supabase.from("clients").update(input).eq("id", id).eq("organization_id", orgId);
  const result = await query.select("*").single();

  throwDbError(result.error, "Failed to update client");
  if (!result.data) {
    throw new Error("Client update returned no record");
  }
  return result.data;
}
