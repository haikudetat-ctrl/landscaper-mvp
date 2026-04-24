import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { getPropertyById } from "@/lib/db/properties";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { property, servicePlans, upcomingVisits, recentInvoices } = await getPropertyById(id);
  const linkedClient = Array.isArray(property.clients) ? property.clients[0] : property.clients;

  return (
    <div className="space-y-4">
      <PageHeader
        title={formatAddress(property)}
        description="Property operational detail"
        actions={<LinkButton href={`/properties/${id}/edit`} label="Edit property" />}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Linked Client">
          <p className="font-medium">{linkedClient?.full_name ?? "No client linked"}</p>
          <p className="text-sm text-zinc-600">{linkedClient?.primary_email ?? "No email"}</p>
          <p className="text-sm text-zinc-600">{linkedClient?.primary_phone ?? "No phone"}</p>
        </SectionCard>

        <SectionCard title="Service Notes">
          <p className="text-sm text-zinc-700">{property.service_notes ?? "No service notes"}</p>
        </SectionCard>

        <SectionCard title="Access Notes">
          <p className="text-sm text-zinc-700">{property.access_notes ?? "No access notes"}</p>
        </SectionCard>
      </section>

      <SectionCard
        title="Service Plans"
        right={<Link href="/service-plans/new" className="text-sm underline">Add plan</Link>}
      >
        {servicePlans.length === 0 ? (
          <EmptyState title="No service plans for this property" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {servicePlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/service-plans/${plan.id}`}
                  className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="text-sm font-semibold text-zinc-900">{plan.plan_name ?? "Untitled"}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-600">
                    <span>{plan.frequency_type ?? "-"}</span>
                    <StatusPill status={plan.status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{formatCurrencyFromCents(plan.quoted_price)}</p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Plan</Th>
                    <Th>Frequency</Th>
                    <Th>Status</Th>
                    <Th align="right">Price</Th>
                  </tr>
                </thead>
                <tbody>
                  {servicePlans.map((plan) => (
                    <tr key={plan.id} className="border-t border-zinc-200">
                      <Td>
                        <Link href={`/service-plans/${plan.id}`} className="font-medium underline">
                          {plan.plan_name ?? "Untitled"}
                        </Link>
                      </Td>
                      <Td>{plan.frequency_type ?? "-"}</Td>
                      <Td>
                        <StatusPill status={plan.status} />
                      </Td>
                      <Td align="right">{formatCurrencyFromCents(plan.quoted_price)}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Upcoming Visits" right={<Link href="/service-visits" className="text-sm underline">Open visits</Link>}>
        {upcomingVisits.length === 0 ? (
          <EmptyState title="No upcoming visits" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {upcomingVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/service-visits/${visit.id}`}
                  className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900">{formatDate(visit.scheduled_date)}</p>
                    <StatusPill status={visit.status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    {Array.isArray(visit.service_types) ? visit.service_types[0]?.label ?? "-" : visit.service_types?.label ?? "-"}
                  </p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Service</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingVisits.map((visit) => (
                    <tr key={visit.id} className="border-t border-zinc-200">
                      <Td>
                        <Link href={`/service-visits/${visit.id}`} className="font-medium underline">
                          {formatDate(visit.scheduled_date)}
                        </Link>
                      </Td>
                      <Td>{Array.isArray(visit.service_types) ? visit.service_types[0]?.label ?? "-" : visit.service_types?.label ?? "-"}</Td>
                      <Td>
                        <StatusPill status={visit.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Recent Invoices">
        {recentInvoices.length === 0 ? (
          <EmptyState title="No invoices for this property" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {recentInvoices.map((invoice) => (
                <Link
                  key={invoice.invoice_id}
                  href={`/invoices/${invoice.invoice_id}`}
                  className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">#{invoice.invoice_number ?? "-"}</p>
                    <StatusPill status={invoice.invoice_status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">Due {formatDate(invoice.due_date)}</p>
                  <p className="mt-1 text-xs font-medium text-zinc-800">
                    Remaining {formatCurrencyFromCents(invoice.amount_remaining)}
                  </p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Due date</Th>
                    <Th>Status</Th>
                    <Th align="right">Remaining</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.invoice_id} className="border-t border-zinc-200">
                      <Td>
                        <Link href={`/invoices/${invoice.invoice_id}`} className="font-medium underline">
                          #{invoice.invoice_number ?? "-"}
                        </Link>
                      </Td>
                      <Td>{formatDate(invoice.due_date)}</Td>
                      <Td>
                        <StatusPill status={invoice.invoice_status} />
                      </Td>
                      <Td align="right">{formatCurrencyFromCents(invoice.amount_remaining)}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
