import Link from "next/link";

import { MobileHomeDashboard } from "@/components/dashboard/mobile-home-dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { getDashboardData } from "@/lib/db/dashboard";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      <MobileHomeDashboard data={data.mobile} />

      <div className="hidden space-y-6 md:block">
        <PageHeader
          title="Operational Dashboard"
          description="Property-first daily view for scheduling, billing, and follow-up tasks."
        />

        <section className="grid gap-2 sm:hidden">
          <LinkButton href="/service-visits" label="Open Today's Visits" />
          <LinkButton href="/properties" label="Open Properties" tone="secondary" />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <SectionCard title="Today&apos;s Jobs">
            <p className="text-2xl font-semibold">{data.todayJobs.length}</p>
            <p className="mt-1 text-sm text-zinc-600">Scheduled for today</p>
            {data.missedAppointmentCount > 0 ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                Missed backlog: {data.missedAppointmentCount}
              </p>
            ) : null}
          </SectionCard>
          <SectionCard title="Unpaid Balances">
            <p className="text-2xl font-semibold">
              {formatCurrencyFromCents(data.unpaidSummary.amountRemaining)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">Across {data.unpaidSummary.openInvoiceCount} invoices</p>
          </SectionCard>
          <SectionCard title="Overdue Invoices">
            <p className="text-2xl font-semibold">{data.overdueInvoices.length}</p>
            <p className="mt-1 text-sm text-zinc-600">Need follow-up</p>
          </SectionCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Today&apos;s Jobs" right={<Link className="text-sm text-zinc-600 underline" href="/service-visits">Open visits</Link>}>
          {data.todayJobs.length === 0 ? (
            <EmptyState title="No jobs scheduled for today" />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {data.todayJobs.slice(0, 8).map((job) => (
                  <Link
                    key={job.service_visit_id}
                    href={`/service-visits/${job.service_visit_id ?? ""}`}
                    className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <p className="text-sm font-semibold text-zinc-900">{formatAddress(job)}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{job.client_name ?? "No client"}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-600">{job.service_type_label ?? "-"}</span>
                      <StatusPill status={job.visit_status} />
                    </div>
                  </Link>
                ))}
              </div>
              <div className="hidden md:block">
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Property</Th>
                      <Th>Service</Th>
                      <Th>Client</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.todayJobs.slice(0, 8).map((job) => (
                      <tr key={job.service_visit_id} className="border-t border-zinc-200">
                        <Td>
                          <Link href={`/service-visits/${job.service_visit_id ?? ""}`} className="font-medium text-zinc-900 underline">
                            {formatAddress(job)}
                          </Link>
                        </Td>
                        <Td>{job.service_type_label ?? "-"}</Td>
                        <Td>{job.client_name ?? "-"}</Td>
                        <Td>
                          <StatusPill status={job.visit_status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Upcoming Week" right={<Link className="text-sm text-zinc-600 underline" href="/service-visits">Open visits</Link>}>
          {data.upcomingWeekJobs.length === 0 ? (
            <EmptyState title="No upcoming visits in the next week" />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {data.upcomingWeekJobs.slice(0, 10).map((job) => (
                  <Link
                    key={job.service_visit_id}
                    href={`/service-visits/${job.service_visit_id ?? ""}`}
                    className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <p className="text-sm font-semibold text-zinc-900">{formatAddress(job)}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-600">
                      <span>{formatDate(job.scheduled_date)}</span>
                      <span>{job.service_type_label ?? "-"}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="hidden md:block">
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Property</Th>
                      <Th>Service</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingWeekJobs.slice(0, 10).map((job) => (
                      <tr key={job.service_visit_id} className="border-t border-zinc-200">
                        <Td>{formatDate(job.scheduled_date)}</Td>
                        <Td>
                          <Link href={`/service-visits/${job.service_visit_id ?? ""}`} className="font-medium text-zinc-900 underline">
                            {formatAddress(job)}
                          </Link>
                        </Td>
                        <Td>{job.service_type_label ?? "-"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </>
          )}
        </SectionCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Skipped Visits Pending Reactivation"
          right={<Link className="text-sm text-zinc-600 underline" href="/service-visits?status=pending_reactivation">View all</Link>}
        >
          {data.skippedPendingReactivation.length === 0 ? (
            <EmptyState title="No pending reactivation visits" />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.skippedPendingReactivation.slice(0, 6).map((visit) => (
                <li key={visit.service_visit_id} className="rounded border border-zinc-200 p-2">
                  <Link href={`/service-visits/${visit.service_visit_id ?? ""}`} className="font-medium underline">
                    {visit.street_1 ?? "Address missing"}
                  </Link>
                  <p className="text-zinc-600">{visit.skip_reason ?? "No reason"}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Overdue Invoices"
          right={<Link className="text-sm text-zinc-600 underline" href="/invoices?status=overdue">View all</Link>}
        >
          {data.overdueInvoices.length === 0 ? (
            <EmptyState title="No overdue invoices" />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.overdueInvoices.slice(0, 6).map((invoice) => (
                <li key={invoice.invoice_id} className="rounded border border-zinc-200 p-2">
                  <Link href={`/invoices/${invoice.invoice_id ?? ""}`} className="font-medium underline">
                    #{invoice.invoice_number ?? "-"}
                  </Link>
                  <p>{formatCurrencyFromCents(invoice.amount_remaining)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Properties Missing Next Service"
          right={<Link className="text-sm text-zinc-600 underline" href="/properties">Open properties</Link>}
        >
          {data.propertiesMissingNextService.length === 0 ? (
            <EmptyState title="All tracked properties have next service" />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.propertiesMissingNextService.slice(0, 6).map((property) => (
                <li key={property.property_id} className="rounded border border-zinc-200 p-2">
                  <Link href={`/properties/${property.property_id ?? ""}`} className="font-medium underline">
                    {formatAddress(property)}
                  </Link>
                  <p className="text-zinc-600">{property.client_name ?? "No client linked"}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        </section>
      </div>
    </>
  );
}
