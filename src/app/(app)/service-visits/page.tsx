import Link from "next/link";

import { ServiceVisitToolbar } from "@/components/service-visits/service-visit-toolbar";
import { TodayVisitReorderCards } from "@/components/service-visits/today-visit-reorder-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { listServiceVisits } from "@/lib/db/service-visits";
import { formatAddress, formatDate } from "@/lib/utils/format";

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekBounds(referenceDate: Date): { weekStart: string; weekEnd: string } {
  const start = new Date(referenceDate);
  const day = start.getDay();
  const offset = (day + 6) % 7;
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { weekStart: toIsoDate(start), weekEnd: toIsoDate(end) };
}

export default async function ServiceVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; view?: string }>;
}) {
  const params = await searchParams;

  const todayDate = new Date();
  const { weekStart, weekEnd } = getWeekBounds(todayDate);

  const fromDate = params.from ?? weekStart;
  const toDate = params.to ?? weekEnd;
  const includeMissedBacklog = params.view === "today";
  const isTodayView = includeMissedBacklog && fromDate === toDate;

  const visits = await listServiceVisits({
    fromDate,
    toDate,
    status: params.status,
    includeMissedBacklogForDate: includeMissedBacklog ? fromDate : undefined,
  });
  const missedCount = visits.filter((visit) =>
    Boolean((visit as { is_missed_appointment?: boolean }).is_missed_appointment),
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service Visits"
        description="Actual scheduled jobs and status actions."
        actions={<LinkButton href="/service-plans" label="Open plans" tone="secondary" />}
      />

      <ServiceVisitToolbar currentFrom={fromDate} currentTo={toDate} />

      {includeMissedBacklog && missedCount > 0 ? (
        <div className="rounded-2xl border border-red-300 bg-red-50/90 px-4 py-2 text-sm font-semibold text-red-800">
          {missedCount} missed appointment{missedCount === 1 ? "" : "s"} from previous days require attention.
        </div>
      ) : null}

      {visits.length === 0 ? (
        <EmptyState title="No visits for selected filters" />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {isTodayView ? (
              <TodayVisitReorderCards key={visits.map((visit) => visit.id).join(":")} visits={visits} />
            ) : (
              visits.map((visit) => {
                const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
                const client = property
                  ? Array.isArray(property.clients)
                    ? property.clients[0]
                    : property.clients
                  : null;
                const serviceType = Array.isArray(visit.service_types)
                  ? visit.service_types[0]
                  : visit.service_types;
                const isMissed = Boolean((visit as { is_missed_appointment?: boolean }).is_missed_appointment);

                return (
                  <Link
                    key={visit.id}
                    href={`/service-visits/${visit.id}`}
                    className={`block rounded-md border p-3 shadow-sm ${
                      isMissed ? "border-red-300 bg-red-50/70" : "border-zinc-200 bg-white"
                    }`}
                  >
                    {isMissed ? (
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                        Missed Appointment
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold text-zinc-900">{formatAddress(property ?? {})}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{client?.full_name ?? "No client"}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-600">
                      <span>{formatDate(visit.scheduled_date)}</span>
                      <StatusPill status={visit.status} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">{serviceType?.label ?? "-"}</p>
                  </Link>
                );
              })
            )}
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
                  const isMissed = Boolean((visit as { is_missed_appointment?: boolean }).is_missed_appointment);

                  return (
                    <tr key={visit.id} className={`border-t border-zinc-200 ${isMissed ? "bg-red-50/60" : ""}`}>
                      <Td>{formatDate(visit.scheduled_date)}</Td>
                      <Td>
                        <Link href={`/service-visits/${visit.id}`} className="font-semibold text-zinc-900 underline">
                          {formatAddress(property ?? {})}
                        </Link>
                        {isMissed ? (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                            Missed appointment
                          </p>
                        ) : null}
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
