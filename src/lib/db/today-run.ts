import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export type TodayVisitRow = {
  id: string;
  organization_id: string;
  status: string;
  scheduled_date: string;
  quoted_price: number;
  operator_notes: string | null;
  invoice?: {
    id: string;
    amount_due: number;
    status: string;
    payment?: {
      id: string;
      status: string | null;
      payment_method: string | null;
      amount: number;
    } | null;
  } | null;
  properties: {
    id: string;
    street_1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    clients: {
      id: string;
      full_name: string;
      primary_phone: string | null;
    } | null;
  } | null;
};

export type TodayRouteSummary = {
  id: string;
  status: string;
  stopCount: number;
  completedCount: number;
  nextStopVisitId: string | null;
};

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function listTodayRunVisits() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const today = localDate();

  const routeResult = await supabase
    .from("routes")
    .select("id, status")
    .eq("organization_id", orgId)
    .eq("route_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwDbError(routeResult.error, "Failed to load route for today's run");
  const route = routeResult.data as { id: string; status: string } | null;

  let visitsResult;
  let routeStops: Array<{ service_visit_id: string; stop_order: number }> = [];
  if (route) {
    const stopsResult = await supabase
      .from("route_stops")
      .select("service_visit_id, stop_order")
      .eq("route_id", route.id)
      .not("service_visit_id", "is", null)
      .order("stop_order", { ascending: true });
    throwDbError(stopsResult.error, "Failed to load route stops");
    routeStops = (stopsResult.data ?? []) as Array<{ service_visit_id: string; stop_order: number }>;
  }

  if (routeStops.length) {
    const visitIds = routeStops.map((stop) => stop.service_visit_id);
    visitsResult = await supabase
      .from("service_visits")
      .select(
        "id, organization_id, status, scheduled_date, quoted_price, operator_notes, properties(id, street_1, city, state, postal_code, clients(id, full_name, primary_phone))",
      )
      .eq("organization_id", orgId)
      .in("id", visitIds)
      .limit(100);
  } else {
    visitsResult = await supabase
      .from("service_visits")
      .select(
        "id, organization_id, status, scheduled_date, quoted_price, operator_notes, properties(id, street_1, city, state, postal_code, clients(id, full_name, primary_phone))",
      )
      .eq("organization_id", orgId)
      .eq("scheduled_date", today)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("scheduled_position", { ascending: true, nullsFirst: false })
      .limit(50);
  }

  throwDbError(visitsResult.error, "Failed to load today's run visits");

  const visitRows = visitsResult.data ?? [];
  const visitIds = visitRows.map((row) => row.id);

  const invoicesResult = visitIds.length
    ? await supabase
        .from("invoices")
        .select("id, service_visit_id, amount_due, status")
        .eq("organization_id", orgId)
        .in("service_visit_id", visitIds)
    : { data: [], error: null };
  throwDbError(invoicesResult.error, "Failed to load visit invoices");

  const invoices = invoicesResult.data ?? [];
  const invoiceByVisitId = new Map(invoices.map((invoice) => [invoice.service_visit_id, invoice]));
  const invoiceIds = invoices.map((invoice) => invoice.id);

  const paymentsResult = invoiceIds.length
    ? await supabase
        .from("payments")
        .select("id, invoice_id, payment_method, amount, status")
        .eq("organization_id", orgId)
        .in("invoice_id", invoiceIds)
    : { data: [], error: null };
  throwDbError(paymentsResult.error, "Failed to load expected payments");

  const payments = (paymentsResult.data ?? []) as Array<{
    id: string;
    invoice_id: string;
    payment_method: string | null;
    amount: number;
    status: string | null;
  }>;
  const firstPaymentByInvoiceId = new Map<string, (typeof payments)[number]>();
  for (const payment of payments) {
    if (!firstPaymentByInvoiceId.has(payment.invoice_id)) {
      firstPaymentByInvoiceId.set(payment.invoice_id, payment);
    }
  }

  const mapped = visitRows.map((row) => {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const client = property?.clients
      ? Array.isArray(property.clients)
        ? property.clients[0]
        : property.clients
      : null;

    const invoice = invoiceByVisitId.get(row.id) ?? null;
    const payment = invoice ? firstPaymentByInvoiceId.get(invoice.id) : null;

    return {
      ...row,
      invoice: invoice
        ? {
            id: invoice.id,
            amount_due: invoice.amount_due,
            status: invoice.status,
            payment: payment
              ? {
                  id: payment.id,
                  status: payment.status,
                  payment_method: payment.payment_method,
                  amount: payment.amount,
                }
              : null,
          }
        : null,
      properties: property
        ? {
            ...property,
            clients: client,
          }
        : null,
    } as TodayVisitRow;
  });

  if (routeStops.length) {
    const orderByVisitId = new Map(routeStops.map((stop) => [stop.service_visit_id, stop.stop_order]));
    mapped.sort((a, b) => (orderByVisitId.get(a.id) ?? 9999) - (orderByVisitId.get(b.id) ?? 9999));
  }

  const completedCount = mapped.filter((visit) => visit.status === "completed").length;
  const nextStop = mapped.find((visit) => visit.status !== "completed" && visit.status !== "cancelled");
  const routeSummary: TodayRouteSummary | null = route
    ? {
        id: route.id,
        status: route.status,
        stopCount: mapped.length,
        completedCount,
        nextStopVisitId: nextStop?.id ?? null,
      }
    : null;

  return {
    visits: mapped,
    route: routeSummary,
  };
}
