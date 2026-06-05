import { PageHeader } from "@/components/ui/page-header";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { getReportsSummary } from "@/lib/db/ops-dashboard";
import { formatCurrencyFromCents } from "@/lib/utils/format";

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#a7b8a6] bg-[#f6f8f4] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export default async function ReportsPage() {
  await requirePagePermission(PERMISSIONS.reportsView);
  const summary = await getReportsSummary();

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description={`Operational KPI scaffold for owner-level visibility. Range: ${summary.rangeLabel}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Jobs Completed This Week" value={String(summary.jobsCompletedThisWeek)} />
        <Card label="Invoices Generated This Week" value={String(summary.invoicesGeneratedThisWeek)} />
        <Card label="Invoices Sent This Week" value={String(summary.invoicesSentThisWeek)} />
        <Card label="Payments Received This Week" value={String(summary.paymentsReceivedThisWeek)} />
        <Card label="Open Issues" value={String(summary.openIssues)} />
        <Card label="Follow-Up Visits" value={String(summary.followUpVisits)} />
        <Card label="Revenue Collected" value={formatCurrencyFromCents(summary.revenueCollected)} />
        <Card label="Outstanding Expected Payments" value={formatCurrencyFromCents(summary.outstandingExpectedPayments)} />
        <Card label="Scheduled Visits This Week" value={String(summary.scheduledVisitsThisWeek)} />
        <Card label="Completed vs Scheduled" value={summary.completedVsScheduled} />
        <Card label="Delayed Weather Count" value={String(summary.delayedWeatherCount)} />
        <Card label="Route Completion Rate" value={`${summary.routeCompletionRate}%`} />
        <Card label="Average Stops Per Day" value={String(summary.averageStopsPerDay)} />
      </div>
      {summary.completedVsScheduled === "0/0" ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
          No report activity yet for this range.
        </div>
      ) : null}
    </div>
  );
}
