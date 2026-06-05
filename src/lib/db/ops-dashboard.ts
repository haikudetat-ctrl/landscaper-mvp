import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export async function getOpsDashboardSummary() {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    todayJobsResult,
    routeResult,
    openInvoicesResult,
    pendingPaymentsResult,
    openIssuesResult,
    newLeadsResult,
    weeklyRevenueResult,
    followUpResult,
  ] = await Promise.all([
    supabase.from("service_visits").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("scheduled_date", today),
    supabase.from("routes").select("id, status").eq("organization_id", orgId).eq("route_date", today).order("created_at", { ascending: false }).limit(1),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["sent", "viewed", "overdue", "partially_paid"]),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["expected", "pending_confirmation"]),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["open", "acknowledged", "customer_notified"]),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "new"),
    supabase
      .from("payments")
      .select("amount")
      .eq("organization_id", orgId)
      .gte("payment_date", weekAgo)
      .lte("payment_date", today)
      .in("status", ["received", "reconciled"]),
    supabase
      .from("service_visits")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["blocked_access", "needs_follow_up", "needs_review", "pending_reactivation"]),
  ]);

  throwDbError(todayJobsResult.error, "Failed to load today's job count");
  throwDbError(routeResult.error, "Failed to load route status");
  throwDbError(openInvoicesResult.error, "Failed to load open invoices");
  throwDbError(pendingPaymentsResult.error, "Failed to load pending payments");
  throwDbError(openIssuesResult.error, "Failed to load issues");
  throwDbError(newLeadsResult.error, "Failed to load leads");
  throwDbError(weeklyRevenueResult.error, "Failed to load weekly revenue");
  throwDbError(followUpResult.error, "Failed to load follow-up count");

  const weeklyRevenue = (weeklyRevenueResult.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const route = (routeResult.data as Array<{ status: string }> | null)?.[0] ?? null;

  return {
    todayJobs: todayJobsResult.count ?? 0,
    routeStatus: route?.status ?? "not_started",
    openInvoices: openInvoicesResult.count ?? 0,
    pendingPayments: pendingPaymentsResult.count ?? 0,
    openIssues: openIssuesResult.count ?? 0,
    newLeads: newLeadsResult.count ?? 0,
    weeklyRevenue,
    followUpsNeeded: followUpResult.count ?? 0,
  };
}

export async function getReportsSummary() {
  try {
    const supabase = createSupabaseServerClient();
    const { orgId } = await requireOrgContext();
    const now = new Date();
    const weekAgoDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const weekAgo = weekAgoDate.toISOString();
    const todayDate = now.toISOString().slice(0, 10);
    const weekStartDate = weekAgoDate.toISOString().slice(0, 10);

    const [
    completedJobsEventsResult,
    invoicesGeneratedEventsResult,
    invoicesSentEventsResult,
    paymentsReceivedEventsResult,
    issuesResult,
    followUpResult,
    paymentsCollectedResult,
    outstandingExpectedPaymentsResult,
    scheduledVisitsWeekResult,
    delayedWeatherWeekResult,
    routesWeekResult,
    stopsWeekResult,
    ] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("event_type", "visit_completed")
      .gte("created_at", weekAgo),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("event_type", "invoice_generated")
      .gte("created_at", weekAgo),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("event_type", "invoice_sent")
      .gte("created_at", weekAgo),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("event_type", "payment_received")
      .gte("created_at", weekAgo),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", orgId).neq("status", "closed"),
    supabase
      .from("service_visits")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "needs_follow_up"),
    supabase
      .from("payments")
      .select("amount")
      .eq("organization_id", orgId)
      .in("status", ["received", "reconciled"])
      .gte("payment_date", weekAgoDate.toISOString().slice(0, 10))
      .lte("payment_date", todayDate),
    supabase
      .from("payments")
      .select("amount")
      .eq("organization_id", orgId)
      .in("status", ["expected", "pending_confirmation"]),
    supabase
      .from("service_visits")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("scheduled_date", weekStartDate)
      .lte("scheduled_date", todayDate),
    supabase
      .from("service_visits")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "delayed_weather")
      .gte("scheduled_date", weekStartDate)
      .lte("scheduled_date", todayDate),
    supabase
      .from("routes")
      .select("id, status")
      .eq("organization_id", orgId)
      .gte("route_date", weekStartDate)
      .lte("route_date", todayDate),
    supabase
      .from("route_stops")
      .select("route_id")
      .eq("organization_id", orgId)
      .gte("created_at", weekAgo),
  ]);

    throwDbError(completedJobsEventsResult.error, "Failed to load completed jobs");
    throwDbError(invoicesGeneratedEventsResult.error, "Failed to load generated invoices");
    throwDbError(invoicesSentEventsResult.error, "Failed to load sent invoices");
    throwDbError(paymentsReceivedEventsResult.error, "Failed to load received payments");
    throwDbError(issuesResult.error, "Failed to load issues");
    throwDbError(followUpResult.error, "Failed to load follow-up visits");
    throwDbError(paymentsCollectedResult.error, "Failed to load collected revenue");
    throwDbError(outstandingExpectedPaymentsResult.error, "Failed to load expected payments");
    throwDbError(scheduledVisitsWeekResult.error, "Failed to load scheduled visits");
    throwDbError(delayedWeatherWeekResult.error, "Failed to load delayed weather count");
    throwDbError(routesWeekResult.error, "Failed to load route completions");
    throwDbError(stopsWeekResult.error, "Failed to load route stops");

    const revenueCollected = (paymentsCollectedResult.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const outstandingExpected = (outstandingExpectedPaymentsResult.data ?? []).reduce(
      (sum, row) => sum + (row.amount ?? 0),
      0,
    );
    const routes = (routesWeekResult.data ?? []) as Array<{ id: string; status: string }>;
    const completedRoutes = routes.filter((route) => route.status === "completed").length;
    const routeCompletionRate = routes.length ? Math.round((completedRoutes / routes.length) * 100) : 0;
    const stopRows = (stopsWeekResult.data ?? []) as Array<{ route_id: string }>;
    const uniqueRoutesWithStops = new Set(stopRows.map((row) => row.route_id));
    const averageStopsPerDay = uniqueRoutesWithStops.size
      ? Number((stopRows.length / 7).toFixed(1))
      : 0;
    const rangeLabel = `${weekStartDate} to ${todayDate}`;

    return {
      jobsCompletedThisWeek: completedJobsEventsResult.count ?? 0,
      invoicesGeneratedThisWeek: invoicesGeneratedEventsResult.count ?? 0,
      invoicesSentThisWeek: invoicesSentEventsResult.count ?? 0,
      paymentsReceivedThisWeek: paymentsReceivedEventsResult.count ?? 0,
      openIssues: issuesResult.count ?? 0,
      followUpVisits: followUpResult.count ?? 0,
      revenueCollected,
      outstandingExpectedPayments: outstandingExpected,
      scheduledVisitsThisWeek: scheduledVisitsWeekResult.count ?? 0,
      completedVsScheduled: `${completedJobsEventsResult.count ?? 0}/${scheduledVisitsWeekResult.count ?? 0}`,
      delayedWeatherCount: delayedWeatherWeekResult.count ?? 0,
      routeCompletionRate,
      averageStopsPerDay,
      rangeLabel,
    };
  } catch {
    return {
      jobsCompletedThisWeek: 0,
      invoicesGeneratedThisWeek: 0,
      invoicesSentThisWeek: 0,
      paymentsReceivedThisWeek: 0,
      openIssues: 0,
      followUpVisits: 0,
      revenueCollected: 0,
      outstandingExpectedPayments: 0,
      scheduledVisitsThisWeek: 0,
      completedVsScheduled: "0/0",
      delayedWeatherCount: 0,
      routeCompletionRate: 0,
      averageStopsPerDay: 0,
      rangeLabel: "Current week",
    };
  }
}
