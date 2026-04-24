import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FormField, inputClasses, selectClasses } from "@/components/ui/forms";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { listServiceVisits } from "@/lib/db/service-visits";
import { visitStatuses } from "@/lib/utils/constants";
import { formatAddress, formatDate } from "@/lib/utils/format";

import { rainDelayShiftAction } from "@/app/(app)/service-visits/actions";

export default async function ServiceVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const params = await searchParams;

  const todayDate = new Date();
  const nextWeekDate = new Date(todayDate);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);

  const fromDate = params.from ?? todayDate.toISOString().slice(0, 10);
  const toDate = params.to ?? nextWeekDate.toISOString().slice(0, 10);

  const visits = await listServiceVisits({
    fromDate,
    toDate,
    status: params.status,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service Visits"
        description="Actual scheduled jobs and status actions."
        actions={<LinkButton href="/service-plans" label="Open plans" tone="secondary" />}
      />

      <SectionCard title="Filters">
        <form className="grid gap-3 md:grid-cols-4 md:items-end" method="GET">
          <FormField label="From" name="from">
            <input id="from" name="from" type="date" defaultValue={fromDate} className={inputClasses()} />
          </FormField>
          <FormField label="To" name="to">
            <input id="to" name="to" type="date" defaultValue={toDate} className={inputClasses()} />
          </FormField>
          <FormField label="Status" name="status">
            <select id="status" name="status" defaultValue={params.status ?? ""} className={selectClasses()}>
              <option value="">All statuses</option>
              {visitStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>
          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white">
            Apply
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Rain Delay Bulk Shift">
        <form action={rainDelayShiftAction} className="grid gap-3 md:grid-cols-4 md:items-end">
          <FormField label="Date to shift" name="fromDate" required>
            <input id="fromDate" name="fromDate" type="date" defaultValue={fromDate} className={inputClasses()} required />
          </FormField>
          <FormField label="Reason" name="reason" required>
            <input id="reason" name="reason" defaultValue="Rain delay" className={inputClasses()} required />
          </FormField>
          <div className="sm:col-span-2">
            <SubmitButton label="Shift day to next day" pendingLabel="Shifting..." />
          </div>
        </form>
      </SectionCard>

      {visits.length === 0 ? (
        <EmptyState title="No visits for selected filters" />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {visits.map((visit) => {
              const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
              const client = property
                ? Array.isArray(property.clients)
                  ? property.clients[0]
                  : property.clients
                : null;
              const serviceType = Array.isArray(visit.service_types)
                ? visit.service_types[0]
                : visit.service_types;

              return (
                <Link
                  key={visit.id}
                  href={`/service-visits/${visit.id}`}
                  className="block rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
                >
                  <p className="text-sm font-semibold text-zinc-900">{formatAddress(property ?? {})}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">{client?.full_name ?? "No client"}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-600">
                    <span>{formatDate(visit.scheduled_date)}</span>
                    <StatusPill status={visit.status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{serviceType?.label ?? "-"}</p>
                </Link>
              );
            })}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Property</Th>
                  <Th>Client</Th>
                  <Th>Service</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => {
                  const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
                  const client = property
                    ? Array.isArray(property.clients)
                      ? property.clients[0]
                      : property.clients
                    : null;
                  const serviceType = Array.isArray(visit.service_types)
                    ? visit.service_types[0]
                    : visit.service_types;

                  return (
                    <tr key={visit.id} className="border-t border-zinc-200">
                      <Td>{formatDate(visit.scheduled_date)}</Td>
                      <Td>
                        <Link href={`/service-visits/${visit.id}`} className="font-semibold text-zinc-900 underline">
                          {formatAddress(property ?? {})}
                        </Link>
                      </Td>
                      <Td>{client?.full_name ?? "-"}</Td>
                      <Td>{serviceType?.label ?? "-"}</Td>
                      <Td>
                        <StatusPill status={visit.status} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
