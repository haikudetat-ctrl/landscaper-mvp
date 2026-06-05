import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Views } from "@/lib/types/database";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";
import { getDashboardWeather } from "@/lib/weather/openweather";

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
  missedAppointmentCount: number;
  mobile: {
    expectedMonthlyRevenue: number;
    collectedMoneyThisMonth: number;
    rollingRevenueWindowLabel: string;
    rollingSentInvoiceCount: number;
    rollingSentInvoiceAmount: number;
    rollingUnpaidInvoiceCount: number;
    rollingUnpaidInvoiceAmount: number;
    rollingOverdueInvoiceCount: number;
    rollingOverdueInvoiceAmount: number;
    monthlyCompletedJobs: number;
    monthlyTotalJobs: number;
    todayCompletedJobs: number;
    todayTotalJobs: number;
    todayExpectedRevenue: number;
    overdueVisitCount: number;
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
    weather: {
      icon: string;
      label: string;
      tempLow: number | null;
      tempHigh: number | null;
    } | null;
  };
};

function toLocalDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const now = new Date();
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStartDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const rollingRevenueStartDate = new Date(now);
  rollingRevenueStartDate.setDate(rollingRevenueStartDate.getDate() - 14);
  const rollingRevenueEndExclusiveDate = new Date(now);
  rollingRevenueEndExclusiveDate.setDate(rollingRevenueEndExclusiveDate.getDate() + 14);
  const rollingRevenueDisplayEndDate = new Date(rollingRevenueEndExclusiveDate);
  rollingRevenueDisplayEndDate.setDate(rollingRevenueDisplayEndDate.getDate() - 1);

  const monthStart = monthStartDate.toISOString().slice(0, 10);
  const nextMonthStart = nextMonthStartDate.toISOString().slice(0, 10);
  const rollingRevenueStart = toLocalDateString(rollingRevenueStartDate);
  const rollingRevenueEndExclusive = toLocalDateString(rollingRevenueEndExclusiveDate);
  const today = toLocalDateString(now);
  const rollingRevenueWindowLabel = `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(rollingRevenueStartDate)} - ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(rollingRevenueDisplayEndDate)}`;

  const [
    todayJobsResult,
    upcomingResult,
    balancesResult,
    overdueResult,
    skippedResult,
    missingNextResult,
    monthlyVisitsResult,
    rollingRevenueVisitsResult,
    rollingRevenuePaymentsResult,
    rollingInvoicesResult,
    rollingInvoiceBalancesResult,
    nextJobResult,
    todayBacklogResult,
    weatherSnapshot,
  ] = await Promise.all([
    supabase.from("v_today_jobs").select("*").eq("organization_id", orgId).order("scheduled_date", { ascending: true }),
    supabase
      .from("v_upcoming_week_jobs")
      .select("*")
      .eq("organization_id", orgId)
      .order("scheduled_date", { ascending: true }),
    supabase.from("v_invoice_balances").select("invoice_id, amount_remaining").eq("organization_id", orgId),
    supabase
      .from("v_overdue_invoices")
      .select("*")
      .eq("organization_id", orgId)
      .order("due_date", { ascending: true }),
    supabase
      .from("v_skipped_visits_pending_reactivation")
      .select("*")
      .eq("organization_id", orgId)
      .order("scheduled_date", { ascending: true }),
    supabase.from("v_properties_missing_next_service").select("*").eq("organization_id", orgId).limit(50),
    supabase
      .from("service_visits")
      .select("id, status, quoted_price, scheduled_date")
      .eq("organization_id", orgId)
      .gte("scheduled_date", monthStart)
      .lt("scheduled_date", nextMonthStart),
    supabase
      .from("service_visits")
      .select("id, status, quoted_price, scheduled_date")
      .eq("organization_id", orgId)
      .gte("scheduled_date", rollingRevenueStart)
      .lt("scheduled_date", rollingRevenueEndExclusive),
    supabase
      .from("payments")
      .select("amount")
      .eq("organization_id", orgId)
      .gte("payment_date", rollingRevenueStart)
      .lt("payment_date", rollingRevenueEndExclusive),
    supabase
      .from("invoices")
      .select("id, amount_due, invoice_date, email_sent_at")
      .eq("organization_id", orgId)
      .gte("invoice_date", rollingRevenueStart)
      .lt("invoice_date", rollingRevenueEndExclusive),
    supabase
      .from("v_invoice_balances")
      .select("invoice_id, invoice_date, due_date, amount_remaining")
      .eq("organization_id", orgId)
      .gte("invoice_date", rollingRevenueStart)
      .lt("invoice_date", rollingRevenueEndExclusive),
    supabase
      .from("service_visits")
      .select("id, property_id, quoted_price, scheduled_date, status, scheduled_position, scheduled_at, properties(street_1, city, state, postal_code)")
      .eq("organization_id", orgId)
      .eq("scheduled_date", today)
      .not("status", "in", "(completed,cancelled,canceled,invoice_generated)")
      .order("scheduled_position", { ascending: true, nullsFirst: false })
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(50),
    supabase.rpc("list_today_visits_with_missed_backlog", {
      p_target_date: today,
    }),
    getDashboardWeather(),
  ]);

  throwDbError(todayJobsResult.error, "Failed to load today's jobs");
  throwDbError(upcomingResult.error, "Failed to load upcoming jobs");
  throwDbError(balancesResult.error, "Failed to load invoice balances");
  throwDbError(overdueResult.error, "Failed to load overdue invoices");
  throwDbError(skippedResult.error, "Failed to load skipped visits");
  throwDbError(missingNextResult.error, "Failed to load properties missing next service");
  throwDbError(monthlyVisitsResult.error, "Failed to load monthly visit metrics");
  throwDbError(rollingRevenueVisitsResult.error, "Failed to load rolling revenue visit metrics");
  throwDbError(rollingRevenuePaymentsResult.error, "Failed to load rolling revenue payment metrics");
  throwDbError(rollingInvoicesResult.error, "Failed to load rolling invoice metrics");
  throwDbError(rollingInvoiceBalancesResult.error, "Failed to load rolling invoice balance metrics");
  throwDbError(nextJobResult.error, "Failed to load next job");
  throwDbError(todayBacklogResult.error, "Failed to load missed appointment backlog");

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
  const rollingRevenuePayments = rollingRevenuePaymentsResult.data ?? [];
  const rollingInvoices = rollingInvoicesResult.data ?? [];
  const rollingInvoiceBalances = rollingInvoiceBalancesResult.data ?? [];

  const monthlyTotalJobs = monthlyVisits.filter((visit) => visit.status !== "canceled").length;
  const monthlyCompletedJobs = monthlyVisits.filter((visit) => visit.status === "completed").length;
  const collectedMoneyThisMonth = rollingRevenuePayments.reduce((sum, payment) => {
    return sum + (typeof payment.amount === "number" ? payment.amount : 0);
  }, 0);
  const rollingSentInvoices = rollingInvoices.filter((invoice) => Boolean(invoice.email_sent_at));
  const rollingSentInvoiceCount = rollingSentInvoices.length;
  const rollingSentInvoiceAmount = rollingSentInvoices.reduce((sum, invoice) => {
    return sum + (typeof invoice.amount_due === "number" ? invoice.amount_due : 0);
  }, 0);
  const rollingUnpaidInvoices = rollingInvoiceBalances.filter((invoice) => {
    return typeof invoice.amount_remaining === "number" && invoice.amount_remaining > 0;
  });
  const rollingOverdueInvoices = rollingUnpaidInvoices.filter((invoice) => {
    return Boolean(invoice.due_date && invoice.due_date < today);
  });
  const rollingOverdueInvoiceCount = rollingOverdueInvoices.length;
  const rollingOverdueInvoiceAmount = rollingOverdueInvoices.reduce((sum, invoice) => {
    return sum + (typeof invoice.amount_remaining === "number" ? invoice.amount_remaining : 0);
  }, 0);
  const rollingUnpaidInvoiceCount = rollingUnpaidInvoices.length;
  const rollingUnpaidInvoiceAmount = rollingUnpaidInvoices.reduce((sum, invoice) => {
    return sum + (typeof invoice.amount_remaining === "number" ? invoice.amount_remaining : 0);
  }, 0);
  const expectedMonthlyRevenue = collectedMoneyThisMonth + rollingUnpaidInvoiceAmount;

  const todayJobs = todayJobsResult.data ?? [];
  const todayBacklogRows = todayBacklogResult.data ?? [];
  const missedAppointmentCount = todayBacklogRows.filter((row) => row.is_missed_appointment).length;
  const todayTotalJobs = todayJobs.filter((job) => job.visit_status !== "canceled").length;
  const todayCompletedJobs = todayJobs.filter((job) => job.visit_status === "completed").length;
  const todayExpectedRevenue = todayJobs.reduce((sum, job) => {
    if (job.visit_status === "canceled") return sum;
    return sum + (typeof job.quoted_price === "number" ? job.quoted_price : 0);
  }, 0);

  const nextJobCandidates = (nextJobResult.data ?? []) as Array<{
    id: string;
    property_id: string | null;
    quoted_price: number | null;
    scheduled_date: string | null;
    status: string | null;
    scheduled_position: number | null;
    scheduled_at: string | null;
    properties:
      | {
          street_1: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
        }
      | Array<{
          street_1: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
        }>
      | null;
  }>;
  const statusPriority = new Map<string, number>([
    ["in_progress", 0],
    ["arrived", 1],
    ["en_route", 2],
    ["scheduled", 3],
    ["rescheduled", 4],
    ["pending_reactivation", 5],
  ]);
  const rankedCandidates = [...nextJobCandidates].sort((left, right) => {
    const leftRank = statusPriority.get(left.status ?? "") ?? 99;
    const rightRank = statusPriority.get(right.status ?? "") ?? 99;
    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftPosition = left.scheduled_position ?? Number.MAX_SAFE_INTEGER;
    const rightPosition = right.scheduled_position ?? Number.MAX_SAFE_INTEGER;
    if (leftPosition !== rightPosition) return leftPosition - rightPosition;

    const leftAt = left.scheduled_at ? new Date(left.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightAt = right.scheduled_at ? new Date(right.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    return leftAt - rightAt;
  });
  const nextJobRow = rankedCandidates[0] ?? null;
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
    missedAppointmentCount,
    mobile: {
      expectedMonthlyRevenue,
      collectedMoneyThisMonth,
      rollingRevenueWindowLabel,
      rollingSentInvoiceCount,
      rollingSentInvoiceAmount,
      rollingUnpaidInvoiceCount,
      rollingUnpaidInvoiceAmount,
      rollingOverdueInvoiceCount,
      rollingOverdueInvoiceAmount,
      monthlyCompletedJobs,
      monthlyTotalJobs,
      todayCompletedJobs,
      todayTotalJobs,
      todayExpectedRevenue,
      overdueVisitCount: missedAppointmentCount,
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
      weather: weatherSnapshot,
    },
  };
}
