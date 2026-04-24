import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Views } from "@/lib/types/database";
import { throwDbError } from "@/lib/db/shared";

export type DashboardData = {
  todayJobs: Views<"v_today_jobs">[];
  upcomingWeekJobs: Views<"v_upcoming_week_jobs">[];
  skippedPendingReactivation: Views<"v_skipped_visits_pending_reactivation">[];
  propertiesMissingNextService: Views<"v_properties_missing_next_service">[];
  overdueInvoices: Views<"v_overdue_invoices">[];
  unpaidSummary: {
    openInvoiceCount: number;
    amountRemaining: number;
  };
  mobile: {
    expectedMonthlyRevenue: number;
    collectedMoneyThisMonth: number;
    monthlyCompletedJobs: number;
    monthlyTotalJobs: number;
    todayCompletedJobs: number;
    todayTotalJobs: number;
    todayExpectedRevenue: number;
    todayDateLabel: string;
    overdueInvoiceCount: number;
    overdueInvoiceAmount: number;
    unpaidInvoiceCount: number;
    unpaidAmount: number;
    nextJob: {
      visitId: string;
      propertyId: string | null;
      quotedPrice: number;
      scheduledDate: string | null;
      street_1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
    } | null;
  };
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStartDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthStart = monthStartDate.toISOString().slice(0, 10);
  const nextMonthStart = nextMonthStartDate.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [
    todayJobsResult,
    upcomingResult,
    balancesResult,
    overdueResult,
    skippedResult,
    missingNextResult,
    monthlyVisitsResult,
    monthlyPaymentsResult,
    nextJobResult,
  ] = await Promise.all([
    supabase.from("v_today_jobs").select("*").order("scheduled_date", { ascending: true }),
    supabase
      .from("v_upcoming_week_jobs")
      .select("*")
      .order("scheduled_date", { ascending: true }),
    supabase.from("v_invoice_balances").select("invoice_id, amount_remaining"),
    supabase
      .from("v_overdue_invoices")
      .select("*")
      .order("due_date", { ascending: true }),
    supabase
      .from("v_skipped_visits_pending_reactivation")
      .select("*")
      .order("scheduled_date", { ascending: true }),
    supabase.from("v_properties_missing_next_service").select("*").limit(50),
    supabase
      .from("service_visits")
      .select("id, status, quoted_price, scheduled_date")
      .gte("scheduled_date", monthStart)
      .lt("scheduled_date", nextMonthStart),
    supabase
      .from("payments")
      .select("amount")
      .gte("payment_date", monthStart)
      .lt("payment_date", nextMonthStart),
    supabase
      .from("service_visits")
      .select("id, property_id, quoted_price, scheduled_date, status, properties(street_1, city, state, postal_code)")
      .gte("scheduled_date", today)
      .in("status", ["scheduled", "rescheduled", "pending_reactivation"])
      .order("scheduled_date", { ascending: true })
      .limit(1),
  ]);

  throwDbError(todayJobsResult.error, "Failed to load today's jobs");
  throwDbError(upcomingResult.error, "Failed to load upcoming jobs");
  throwDbError(balancesResult.error, "Failed to load invoice balances");
  throwDbError(overdueResult.error, "Failed to load overdue invoices");
  throwDbError(skippedResult.error, "Failed to load skipped visits");
  throwDbError(missingNextResult.error, "Failed to load properties missing next service");
  throwDbError(monthlyVisitsResult.error, "Failed to load monthly visit metrics");
  throwDbError(monthlyPaymentsResult.error, "Failed to load monthly payment metrics");
  throwDbError(nextJobResult.error, "Failed to load next job");

  const balances = balancesResult.data ?? [];
  const amountRemaining = balances.reduce((sum, row) => {
    const amount = typeof row.amount_remaining === "number" ? row.amount_remaining : 0;
    return sum + amount;
  }, 0);

  const overdueRows = overdueResult.data ?? [];
  const overdueInvoiceAmount = overdueRows.reduce((sum, row) => {
    const amount = typeof row.amount_remaining === "number" ? row.amount_remaining : 0;
    return sum + amount;
  }, 0);

  const monthlyVisits = monthlyVisitsResult.data ?? [];
  const monthlyPayments = monthlyPaymentsResult.data ?? [];
  const revenueEligibleStatuses = new Set(["scheduled", "rescheduled", "pending_reactivation"]);

  const monthlyTotalJobs = monthlyVisits.filter((visit) => visit.status !== "canceled").length;
  const monthlyCompletedJobs = monthlyVisits.filter((visit) => visit.status === "completed").length;
  const expectedMonthlyRevenue = monthlyVisits.reduce((sum, visit) => {
    if (!visit.scheduled_date || visit.scheduled_date < today) return sum;
    if (!revenueEligibleStatuses.has(visit.status)) return sum;
    return sum + (typeof visit.quoted_price === "number" ? visit.quoted_price : 0);
  }, 0);
  const collectedMoneyThisMonth = monthlyPayments.reduce((sum, payment) => {
    return sum + (typeof payment.amount === "number" ? payment.amount : 0);
  }, 0);

  const todayJobs = todayJobsResult.data ?? [];
  const todayTotalJobs = todayJobs.filter((job) => job.visit_status !== "canceled").length;
  const todayCompletedJobs = todayJobs.filter((job) => job.visit_status === "completed").length;
  const todayExpectedRevenue = todayJobs.reduce((sum, job) => {
    if (job.visit_status === "canceled") return sum;
    return sum + (typeof job.quoted_price === "number" ? job.quoted_price : 0);
  }, 0);

  const nextJobRow = (nextJobResult.data ?? [])[0] ?? null;
  const nextJobProperty = nextJobRow
    ? Array.isArray(nextJobRow.properties)
      ? nextJobRow.properties[0] ?? null
      : nextJobRow.properties
    : null;
  const nextJob =
    nextJobRow && nextJobRow.id
      ? {
          visitId: nextJobRow.id,
          propertyId: nextJobRow.property_id ?? null,
          quotedPrice: typeof nextJobRow.quoted_price === "number" ? nextJobRow.quoted_price : 0,
          scheduledDate: nextJobRow.scheduled_date ?? null,
          street_1: nextJobProperty?.street_1 ?? null,
          city: nextJobProperty?.city ?? null,
          state: nextJobProperty?.state ?? null,
          postal_code: nextJobProperty?.postal_code ?? null,
        }
      : null;

  return {
    todayJobs,
    upcomingWeekJobs: upcomingResult.data ?? [],
    skippedPendingReactivation: skippedResult.data ?? [],
    propertiesMissingNextService: missingNextResult.data ?? [],
    overdueInvoices: overdueRows,
    unpaidSummary: {
      openInvoiceCount: balances.length,
      amountRemaining,
    },
    mobile: {
      expectedMonthlyRevenue,
      collectedMoneyThisMonth,
      monthlyCompletedJobs,
      monthlyTotalJobs,
      todayCompletedJobs,
      todayTotalJobs,
      todayExpectedRevenue,
      todayDateLabel: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(now),
      overdueInvoiceCount: overdueRows.length,
      overdueInvoiceAmount,
      unpaidInvoiceCount: balances.length,
      unpaidAmount: amountRemaining,
      nextJob,
    },
  };
}
