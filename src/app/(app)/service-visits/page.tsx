import { getServicePlanFormOptions } from "@/lib/db/service-plans";
import { listServiceVisits } from "@/lib/db/service-visits";

import { ServiceVisitsPageShell } from "./service-visits-page-shell";

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

  const [visits, formOptions] = await Promise.all([
    listServiceVisits({
      fromDate,
      toDate,
      status: params.status,
      includeMissedBacklogForDate: includeMissedBacklog ? fromDate : undefined,
    }),
    getServicePlanFormOptions(),
  ]);
  const missedCount = visits.filter((visit) =>
    Boolean((visit as { is_missed_appointment?: boolean }).is_missed_appointment),
  ).length;

  return (
    <ServiceVisitsPageShell
      visits={visits}
      fromDate={fromDate}
      toDate={toDate}
      includeMissedBacklog={includeMissedBacklog}
      isTodayView={isTodayView}
      missedCount={missedCount}
      properties={formOptions.properties}
      serviceTypes={formOptions.serviceTypes}
    />
  );
}
