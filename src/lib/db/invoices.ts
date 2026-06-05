import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/db/operational-events";
import type { Inserts } from "@/lib/types/database";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export async function listInvoices(search?: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  let query = supabase
    .from("v_invoice_balances")
    .select("*")
    .eq("organization_id", orgId)
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
  const { orgId } = await requireOrgContext();
  const result = await supabase.from("v_overdue_invoices").select("*").eq("organization_id", orgId).order("due_date", {
    ascending: true,
  });

  throwDbError(result.error, "Failed to load overdue invoices");
  return result.data ?? [];
}

export async function listCompletedVisitsMissingInvoice() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const result = await supabase
    .from("v_completed_jobs_missing_invoice")
    .select("*")
    .eq("organization_id", orgId)
    .order("completion_timestamp", { ascending: false })
    .limit(200);

  throwDbError(result.error, "Failed to load completed jobs missing invoice");
  return result.data ?? [];
}

export async function getInvoiceById(id: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const [invoiceResult, paymentResult, mediaResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, invoice_date, due_date, amount_due, client_id, property_id, service_visit_id, email_sent_at, last_reminder_sent_at, payment_instructions_snapshot, venmo_handle_snapshot, cash_check_notes_snapshot, clients(id, full_name, primary_email, primary_phone), properties(id, street_1, city, state, postal_code), service_visits(id, scheduled_date, status)",
      )
      .eq("id", id)
      .eq("organization_id", orgId)
      .single(),
    supabase
      .from("payments")
      .select("*")
      .eq("organization_id", orgId)
      .eq("invoice_id", id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("media_assets")
      .select("id, storage_path, photo_type, customer_visible, created_at, service_visit_id")
      .eq("organization_id", orgId)
      .eq("customer_visible", true)
      .eq("photo_type", "after"),
  ]);

  throwDbError(invoiceResult.error, "Failed to load invoice");
  throwDbError(paymentResult.error, "Failed to load invoice payments");
  throwDbError(mediaResult.error, "Failed to load invoice-related photos");

  const balanceResult = await supabase
    .from("v_invoice_balances")
    .select("*")
    .eq("organization_id", orgId)
    .eq("invoice_id", id)
    .single();
  throwDbError(balanceResult.error, "Failed to load invoice balance");

  if (!invoiceResult.data || !balanceResult.data) {
    throw new Error("Invoice not found");
  }

  return {
    invoice: invoiceResult.data,
    balance: balanceResult.data,
    payments: paymentResult.data ?? [],
    mediaAssets: (mediaResult.data as Array<{
      id: string;
      storage_path: string;
      photo_type: string;
      customer_visible: boolean;
      created_at: string;
      service_visit_id: string | null;
    }>) ?? [],
  };
}

export async function createInvoiceForVisit(serviceVisitId: string, dueDays: number) {
  const supabase = createSupabaseServerClient();
  const { orgId, userId } = await requireOrgContext();

  const result = await supabase.rpc("create_invoice_for_visit", {
    p_service_visit_id: serviceVisitId,
    p_due_days: dueDays,
  });

  throwDbError(result.error, "Failed to create invoice from visit");
  if (!result.data) {
    throw new Error("Invoice creation function returned no id");
  }

  await logEvent({
    organizationId: orgId,
    actorUserId: userId,
    entityType: "invoice",
    entityId: result.data,
    eventType: "invoice_created",
    metadata: {
      service_visit_id: serviceVisitId,
      due_days: dueDays,
    },
  });

  return result.data;
}

export async function generateInvoiceDraftFromCompletedVisit(input: {
  serviceVisitId: string;
  dueDays: number;
  paymentMethod: "venmo" | "cash" | "check" | "credit_card_placeholder";
}) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const invoiceId = await createInvoiceForVisit(input.serviceVisitId, input.dueDays);

  const visitResult = await supabase
    .from("service_visits")
    .select("id, organization_id, client_id:properties(client_id), property_id, quoted_price")
    .eq("id", input.serviceVisitId)
    .eq("organization_id", orgId)
    .single();
  throwDbError(visitResult.error, "Failed to load visit context for invoice generation");

  const visit = visitResult.data as
    | {
        id: string;
        organization_id: string;
        property_id: string;
        quoted_price: number;
        client_id: { client_id: string }[] | { client_id: string } | null;
      }
    | null;
  if (!visit) throw new Error("Visit not found for invoice generation");

  const clientId = Array.isArray(visit.client_id) ? visit.client_id[0]?.client_id : visit.client_id?.client_id;
  if (!clientId) throw new Error("Visit is missing client linkage");

  const invoiceUpdate = await supabase
    .from("invoices")
    .update({
      status: "generated",
      generated_at: new Date().toISOString(),
      organization_id: visit.organization_id,
      client_id: clientId,
      property_id: visit.property_id,
      service_visit_id: visit.id,
    })
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .select("id, status, amount_due")
    .single();
  throwDbError(invoiceUpdate.error, "Failed to finalize invoice draft");

  const invoice = invoiceUpdate.data as { id: string; status: string; amount_due: number | null } | null;
  const expectedPaymentAmount = invoice?.amount_due ?? visit.quoted_price ?? 0;

  if (expectedPaymentAmount <= 0) {
    await logEvent({
      organizationId: visit.organization_id,
      entityType: "invoice",
      entityId: invoiceId,
      eventType: "invoice_generated",
      metadata: {
        service_visit_id: input.serviceVisitId,
        payment_method: input.paymentMethod,
        expected_payment_result: "skipped_zero_amount",
      },
    });

    return {
      invoiceId,
      paymentId: null,
      expectedPaymentResult: "skipped_zero_amount" as const,
    };
  }

  const paymentInsert = await supabase
    .from("payments")
    .insert({
      invoice_id: invoiceId,
      organization_id: visit.organization_id,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: input.paymentMethod,
      amount: expectedPaymentAmount,
      status: "expected",
      reference_note: "Expected payment generated with invoice draft.",
    })
    .select("id")
    .single();
  throwDbError(paymentInsert.error, "Failed to create expected payment");
  const paymentRow = paymentInsert.data as { id: string } | null;
  if (!paymentRow) throw new Error("Expected payment insert returned no id");

  await logEvent({
    organizationId: visit.organization_id,
    entityType: "invoice",
    entityId: invoiceId,
    eventType: "invoice_generated",
    metadata: {
      service_visit_id: input.serviceVisitId,
      payment_method: input.paymentMethod,
    },
  });

  await logEvent({
    organizationId: visit.organization_id,
    entityType: "payment",
    entityId: paymentRow.id,
    eventType: "payment_expected",
    metadata: {
      invoice_id: invoiceId,
      method: input.paymentMethod,
    },
  });

  return {
    invoiceId,
    paymentId: paymentRow.id,
    expectedPaymentResult: "created" as const,
  };
}

export async function recordPayment(input: Inserts<"payments">) {
  const supabase = createSupabaseServerClient();
  const { orgId, userId } = await requireOrgContext();
  const invoiceId = input.invoice_id;

  if (!invoiceId) {
    throw new Error("invoice_id is required to record payment");
  }

  const paymentResult = await supabase
    .from("payments")
    .insert({ ...input, organization_id: orgId })
    .select("*")
    .single();
  throwDbError(paymentResult.error, "Failed to record payment");

  const refreshResult = await supabase.rpc("refresh_invoice_status", {
    p_invoice_id: invoiceId,
  });

  throwDbError(refreshResult.error, "Failed to refresh invoice status");
  if (!paymentResult.data) {
    throw new Error("Payment insert returned no record");
  }

  await logEvent({
    organizationId: orgId,
    actorUserId: userId,
    entityType: "invoice",
    entityId: invoiceId,
    eventType: "payment_recorded",
    metadata: {
      payment_id: paymentResult.data.id,
      amount: paymentResult.data.amount,
      payment_date: paymentResult.data.payment_date,
      payment_method: paymentResult.data.payment_method,
      reference_note: paymentResult.data.reference_note,
    },
  });

  return paymentResult.data;
}

export async function markPaymentManuallyReceived(input: {
  paymentId: string;
  method: "venmo" | "cash" | "check";
  reference?: string | null;
}) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const paymentResult = await supabase
    .from("payments")
    .update({
      status: "received",
      payment_method: input.method,
      reference_note: input.reference ?? null,
      updated_at: new Date().toISOString(),
      payment_date: new Date().toISOString().slice(0, 10),
    })
    .eq("id", input.paymentId)
    .eq("organization_id", orgId)
    .select("id, organization_id, invoice_id")
    .single();
  throwDbError(paymentResult.error, "Failed to mark payment received");

  const row = paymentResult.data as { id: string; organization_id: string; invoice_id: string } | null;
  if (!row) throw new Error("Payment not found");

  await supabase.rpc("refresh_invoice_status", {
    p_invoice_id: row.invoice_id,
  });

  await logEvent({
    organizationId: row.organization_id,
    entityType: "payment",
    entityId: row.id,
    eventType: "payment_received",
    metadata: {
      invoice_id: row.invoice_id,
      method: input.method,
    },
  });

  return row;
}

export async function prepareInvoiceSendPreview(input: {
  invoiceId: string;
  includeCreditCardPlaceholder: boolean;
}) {
  const invoiceContext = await getInvoiceById(input.invoiceId);
  const invoice = invoiceContext.invoice;
  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
  const property = Array.isArray(invoice.properties) ? invoice.properties[0] : invoice.properties;
  const visit = Array.isArray(invoice.service_visits) ? invoice.service_visits[0] : invoice.service_visits;

  const lines = [
    `Invoice #${invoice.invoice_number}`,
    `Amount: ${invoice.amount_due}`,
    `Status: ${invoice.status}`,
    `Service Date: ${visit?.scheduled_date ?? "N/A"}`,
    `Property: ${property?.street_1 ?? "-"}, ${property?.city ?? ""} ${property?.state ?? ""} ${property?.postal_code ?? ""}`.trim(),
    "",
    "Payment options:",
    "- Venmo",
    "- Cash",
    "- Check",
    ...(input.includeCreditCardPlaceholder ? ["- Credit Card (placeholder)"] : []),
    "",
    "Thank you for choosing HDZ Landscaping.",
  ].join("\n");

  return {
    recipient: client?.primary_email ?? null,
    subject: `Invoice ${invoice.invoice_number} from HDZ Landscaping`,
    body: lines,
  };
}

export async function markInvoiceSent(input: {
  invoiceId: string;
  previewBody: string;
  recipient: string | null;
  useProvider: boolean;
}) {
  const { orgId, userId } = await requireOrgContext();
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const invoiceResult = await supabase
    .from("invoices")
    .select("id, organization_id, invoice_number")
    .eq("id", input.invoiceId)
    .eq("organization_id", orgId)
    .single();
  throwDbError(invoiceResult.error, "Failed to load invoice for send");

  const invoice = invoiceResult.data as { id: string; organization_id: string; invoice_number: string } | null;
  if (!invoice) throw new Error("Invoice not found");

  const nextStatus = input.useProvider ? "sent" : "generated";
  const sentAt = input.useProvider ? now : null;

  const updateResult = await supabase
    .from("invoices")
    .update({
      status: nextStatus,
      sent_at: sentAt,
      sent_preview: input.previewBody,
      sent_by: userId,
      updated_at: now,
    })
    .eq("id", input.invoiceId)
    .eq("organization_id", orgId)
    .select("id")
    .single();
  throwDbError(updateResult.error, "Failed to update invoice send status");

  await supabase.from("communication_log").insert({
    channel: "email",
    message_type: "invoice_request",
    recipient: input.recipient ?? "preview-only",
    status: input.useProvider ? "sent" : "logged",
    invoice_id: input.invoiceId,
    subject: `Invoice ${invoice.invoice_number}`,
    sent_at: input.useProvider ? now : null,
  });

  await logEvent({
    organizationId: invoice.organization_id,
    actorUserId: userId,
    entityType: "invoice",
    entityId: input.invoiceId,
    eventType: "invoice_sent",
    metadata: {
      recipient: input.recipient,
      mode: input.useProvider ? "sent" : "preview",
    },
  });
}
