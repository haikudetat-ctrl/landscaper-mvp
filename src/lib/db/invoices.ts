import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export async function listInvoices(search?: string) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("v_invoice_balances")
    .select("*")
    .order("due_date", { ascending: false })
    .limit(300);

  if (search && search.trim()) {
    query = query.or(
      `invoice_number.ilike.%${search}%,client_name.ilike.%${search}%,street_1.ilike.%${search}%`,
    );
  }

  const result = await query;
  throwDbError(result.error, "Failed to load invoices");

  return result.data ?? [];
}

export async function listOverdueInvoices() {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("v_overdue_invoices").select("*").order("due_date", {
    ascending: true,
  });

  throwDbError(result.error, "Failed to load overdue invoices");
  return result.data ?? [];
}

export async function listCompletedVisitsMissingInvoice() {
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("v_completed_jobs_missing_invoice")
    .select("*")
    .order("completion_timestamp", { ascending: false })
    .limit(200);

  throwDbError(result.error, "Failed to load completed jobs missing invoice");
  return result.data ?? [];
}

export async function getInvoiceById(id: string) {
  const supabase = createSupabaseServerClient();

  const [invoiceResult, paymentResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, invoice_date, due_date, amount_due, client_id, property_id, service_visit_id, email_sent_at, last_reminder_sent_at, payment_instructions_snapshot, venmo_handle_snapshot, cash_check_notes_snapshot, clients(id, full_name, primary_email, primary_phone), properties(id, street_1, city, state, postal_code), service_visits(id, scheduled_date, status)",
      )
      .eq("id", id)
      .single(),
    supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false }),
  ]);

  throwDbError(invoiceResult.error, "Failed to load invoice");
  throwDbError(paymentResult.error, "Failed to load invoice payments");

  const balanceResult = await supabase.from("v_invoice_balances").select("*").eq("invoice_id", id).single();
  throwDbError(balanceResult.error, "Failed to load invoice balance");

  if (!invoiceResult.data || !balanceResult.data) {
    throw new Error("Invoice not found");
  }

  return {
    invoice: invoiceResult.data,
    balance: balanceResult.data,
    payments: paymentResult.data ?? [],
  };
}

export async function createInvoiceForVisit(serviceVisitId: string, dueDays: number) {
  const supabase = createSupabaseServerClient();

  const result = await supabase.rpc("create_invoice_for_visit", {
    p_service_visit_id: serviceVisitId,
    p_due_days: dueDays,
  });

  throwDbError(result.error, "Failed to create invoice from visit");
  if (!result.data) {
    throw new Error("Invoice creation function returned no id");
  }
  return result.data;
}

export async function recordPayment(input: Inserts<"payments">) {
  const supabase = createSupabaseServerClient();
  const invoiceId = input.invoice_id;

  if (!invoiceId) {
    throw new Error("invoice_id is required to record payment");
  }

  const paymentResult = await supabase.from("payments").insert(input).select("*").single();
  throwDbError(paymentResult.error, "Failed to record payment");

  const refreshResult = await supabase.rpc("refresh_invoice_status", {
    p_invoice_id: invoiceId,
  });

  throwDbError(refreshResult.error, "Failed to refresh invoice status");
  if (!paymentResult.data) {
    throw new Error("Payment insert returned no record");
  }
  return paymentResult.data;
}
