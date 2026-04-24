import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts, Tables } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export async function listClients(search?: string) {
  const supabase = createSupabaseServerClient();

  let query = supabase.from("clients").select("*").order("created_at", { ascending: false });

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
  const result = await supabase.from("clients").select("*").eq("id", id).single();

  throwDbError(result.error, "Failed to load client");
  if (!result.data) {
    throw new Error("Client not found");
  }
  return result.data;
}

export async function getClientDetail(id: string) {
  const supabase = createSupabaseServerClient();

  const [clientResult, propertiesResult, invoicesResult] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("properties")
      .select("*")
      .eq("client_id", id)
      .order("street_1", { ascending: true }),
    supabase
      .from("v_invoice_balances")
      .select("*")
      .eq("client_id", id)
      .order("due_date", { ascending: false }),
  ]);

  throwDbError(clientResult.error, "Failed to load client detail");
  throwDbError(propertiesResult.error, "Failed to load client properties");
  throwDbError(invoicesResult.error, "Failed to load client invoices");

  if (!clientResult.data) {
    throw new Error("Client not found");
  }

  return {
    client: clientResult.data,
    properties: propertiesResult.data ?? [],
    invoices: invoicesResult.data ?? [],
  };
}

export async function createClient(input: Inserts<"clients">): Promise<Tables<"clients">> {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("clients").insert(input).select("*").single();

  throwDbError(result.error, "Failed to create client");
  if (!result.data) {
    throw new Error("Client creation returned no record");
  }
  return result.data;
}

export async function updateClient(id: string, input: Partial<Inserts<"clients">>) {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("clients").update(input).eq("id", id).select("*").single();

  throwDbError(result.error, "Failed to update client");
  if (!result.data) {
    throw new Error("Client update returned no record");
  }
  return result.data;
}
