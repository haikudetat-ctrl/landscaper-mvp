"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ServiceVisitToolbar } from "@/components/service-visits/service-visit-toolbar";
import { TodayVisitReorderCards } from "@/components/service-visits/today-visit-reorder-cards";
import { BottomSheetDialog } from "@/components/ui/bottom-sheet-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import type { getServicePlanFormOptions } from "@/lib/db/service-plans";
import type { listServiceVisits } from "@/lib/db/service-visits";
import { formatAddress, formatDate } from "@/lib/utils/format";
import {
  createServicePlanSheetAction,
  type CreateServicePlanFormState,
} from "@/app/(app)/service-plans/actions";
import { ServicePlanForm } from "@/app/(app)/service-plans/plan-form";

type Visits = Awaited<ReturnType<typeof listServiceVisits>>;
type FormOptions = Awaited<ReturnType<typeof getServicePlanFormOptions>>;

export function ServiceVisitsPageShell({
  visits,
  fromDate,
  toDate,
  includeMissedBacklog,
  isTodayView,
  missedCount,
  properties,
  serviceTypes,
}: {
  visits: Visits;
  fromDate: string;
  toDate: string;
  includeMissedBacklog: boolean;
  isTodayView: boolean;
  missedCount: number;
  properties: FormOptions["properties"];
  serviceTypes: FormOptions["serviceTypes"];
}) {
  const router = useRouter();
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setFlashMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  function handleCreated(state: CreateServicePlanFormState) {
    setIsNewPlanOpen(false);
    setFlashMessage(state.success ?? "Service plan created successfully.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service Visits"
        description="Actual scheduled jobs and status actions."
        actions={
          <>
            <Link
              href="/service-plans"
              className="rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-emerald-50"
            >
              Open plans
            </Link>
            <button
              type="button"
              onClick={() => setIsNewPlanOpen(true)}
              className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
            >
              New service plan
            </button>
          </>
        }
      />

      {flashMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm">
          {flashMessage}
        </p>
      ) : null}

      <ServiceVisitToolbar currentFrom={fromDate} currentTo={toDate} />

      {includeMissedBacklog && missedCount > 0 ? (
        <div className="rounded-2xl border border-[#cc9933] bg-[#ffffcc] px-4 py-2 text-sm font-semibold text-[#666666]">
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
                const serviceType = Array.isArray(visit.service_types) ? visit.service_types[0] : visit.service_types;
                const isMissed = Boolean((visit as { is_missed_appointment?: boolean }).is_missed_appointment);

                return (
                  <Link
                    key={visit.id}
                    href={`/service-visits/${visit.id}`}
                    className={`block rounded-md border p-3 shadow-sm ${
                      isMissed ? "border-[#cc9933] bg-[#ffffcc]" : "border-zinc-200 bg-white"
                    }`}
                  >
                    {isMissed ? (
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
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
                  const serviceType = Array.isArray(visit.service_types) ? visit.service_types[0] : visit.service_types;
                  const isMissed = Boolean((visit as { is_missed_appointment?: boolean }).is_missed_appointment);

                  return (
                    <tr key={visit.id} className={`border-t border-zinc-200 ${isMissed ? "bg-[#ffffcc]" : ""}`}>
                      <Td>{formatDate(visit.scheduled_date)}</Td>
                      <Td>
                        <Link href={`/service-visits/${visit.id}`} className="font-semibold text-zinc-900 underline">
                          {formatAddress(property ?? {})}
                        </Link>
                        {isMissed ? (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#666666]">
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

      <BottomSheetDialog open={isNewPlanOpen} onClose={() => setIsNewPlanOpen(false)} eyebrow="Service Visits" title="New Service Plan">
        <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-[6px] pb-6 pt-4 sm:px-[10px]">
          <ServicePlanForm
            action={async () => {}}
            stateAction={createServicePlanSheetAction}
            properties={properties}
            serviceTypes={serviceTypes}
            submitLabel="Create plan"
            requiredFieldsNote="Required fields: Property, Plan name, Service type, Frequency, Status, Start date, and Quoted price."
            onSuccess={handleCreated}
            resetOnSuccess
            className="px-[6px] sm:px-[10px]"
          />
        </div>
      </BottomSheetDialog>
    </div>
  );
}
