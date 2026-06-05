import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

type CommunicationOrgLink = {
  client_id?: string | null;
  property_id?: string | null;
  service_visit_id?: string | null;
  invoice_id?: string | null;
  lead_id?: string | null;
};

function idsFor(rows: CommunicationOrgLink[], key: keyof CommunicationOrgLink) {
  return Array.from(new Set(rows.map((row) => row[key]).filter((id): id is string => Boolean(id))));
}

async function ownedIdSet(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  table: "clients" | "properties" | "service_visits" | "invoices" | "leads",
  ids: string[],
  orgId: string,
) {
  if (ids.length === 0) return new Set<string>();

  const result = await supabase
    .from(table)
    .select("id")
    .eq("organization_id", orgId)
    .in("id", ids);

  throwDbError(result.error, `Failed to verify ${table} ownership for communication log`);
  return new Set((result.data ?? []).map((row) => row.id));
}

async function filterCommunicationRowsByOrg<T extends CommunicationOrgLink>(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  rows: T[],
  orgId: string,
) {
  const [clientIds, propertyIds, visitIds, invoiceIds, leadIds] = await Promise.all([
    ownedIdSet(supabase, "clients", idsFor(rows, "client_id"), orgId),
    ownedIdSet(supabase, "properties", idsFor(rows, "property_id"), orgId),
    ownedIdSet(supabase, "service_visits", idsFor(rows, "service_visit_id"), orgId),
    ownedIdSet(supabase, "invoices", idsFor(rows, "invoice_id"), orgId),
    ownedIdSet(supabase, "leads", idsFor(rows, "lead_id"), orgId),
  ]);

  return rows.filter((row) => {
    return (
      (row.client_id && clientIds.has(row.client_id)) ||
      (row.property_id && propertyIds.has(row.property_id)) ||
      (row.service_visit_id && visitIds.has(row.service_visit_id)) ||
      (row.invoice_id && invoiceIds.has(row.invoice_id)) ||
      (row.lead_id && leadIds.has(row.lead_id))
    );
  });
}

export async function listCommunicationLog(search?: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  let query = supabase
    .from("communication_log")
    .select(
      "id, created_at, sent_at, message_type, channel, recipient, subject, status, error_message, client_id, property_id, invoice_id, service_visit_id, lead_id, clients(id, full_name), properties(id, street_1, city, state, postal_code), invoices(id, invoice_number)",
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

  return filterCommunicationRowsByOrg(supabase, (result.data ?? []) as Array<NonNullable<typeof result.data>[number] & CommunicationOrgLink>, orgId);
}

export async function getCommunicationLogById(id: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const result = await supabase
    .from("communication_log")
    .select(
      "id, created_at, sent_at, message_type, channel, recipient, subject, status, error_message, provider_message_id, client_id, property_id, invoice_id, service_visit_id, lead_id, clients(id, full_name, primary_email, primary_phone), properties(id, street_1, city, state, postal_code), invoices(id, invoice_number), service_visits(id, scheduled_date, status)",
    )
    .eq("id", id)
    .single();

  throwDbError(result.error, "Failed to load communication record");
  if (!result.data) {
    throw new Error("Communication record not found");
  }

  const ownedRows = await filterCommunicationRowsByOrg(supabase, [result.data as typeof result.data & CommunicationOrgLink], orgId);
  if (ownedRows.length === 0) {
    throw new Error("Communication record not found");
  }

  return result.data;
}
