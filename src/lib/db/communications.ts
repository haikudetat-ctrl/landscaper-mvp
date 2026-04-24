import { createSupabaseServerClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/db/shared";

export async function listCommunicationLog(search?: string) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("communication_log")
    .select(
      "id, created_at, sent_at, message_type, channel, recipient, subject, status, error_message, client_id, property_id, invoice_id, service_visit_id, clients(id, full_name), properties(id, street_1, city, state, postal_code), invoices(id, invoice_number)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (search && search.trim()) {
    query = query.or(
      `recipient.ilike.%${search}%,subject.ilike.%${search}%,message_type.ilike.%${search}%,channel.ilike.%${search}%`,
    );
  }

  const result = await query;
  throwDbError(result.error, "Failed to load communication log");

  return result.data ?? [];
}

export async function getCommunicationLogById(id: string) {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("communication_log")
    .select(
      "id, created_at, sent_at, message_type, channel, recipient, subject, status, error_message, provider_message_id, client_id, property_id, invoice_id, service_visit_id, clients(id, full_name, primary_email, primary_phone), properties(id, street_1, city, state, postal_code), invoices(id, invoice_number), service_visits(id, scheduled_date, status)",
    )
    .eq("id", id)
    .single();

  throwDbError(result.error, "Failed to load communication record");
  if (!result.data) {
    throw new Error("Communication record not found");
  }
  return result.data;
}
