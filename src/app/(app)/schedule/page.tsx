import { PageHeader } from "@/components/ui/page-header";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { getTodayRouteStops } from "@/lib/db/routes";
import { listScheduleFormOptions, listScheduleVisits, weekBounds } from "@/lib/db/schedule";
import { formatCurrencyFromCents } from "@/lib/utils/format";

import {
  bulkWeatherDelayAction,
  completeRouteAction,
  createTodayRouteAction,
  createVisitAction,
  moveRouteStopDownAction,
  moveRouteStopUpAction,
  quickRescheduleAction,
  reorderRouteAction,
  startRouteAction,
} from "./actions";

function statusTone(status: string) {
  if (["completed"].includes(status)) return "bg-[#d7e3d4] text-[#1e412d] border-[#93ab92]";
  if (["in_progress", "arrived", "en_route"].includes(status)) return "bg-[#d4ddd8] text-[#20372b] border-[#8ea296]";
  if (["delayed_weather", "blocked_access", "needs_follow_up", "skipped", "cancelled", "canceled"].includes(status)) {
    return "bg-[#ede4c9] text-[#4d421d] border-[#b7a978]";
  }
  return "bg-[#e2e8e0] text-[#33463a] border-[#a0b19f]";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(value));
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; status?: string; message?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.scheduleView);

  const today = new Date();
  const params = await searchParams;
  const selectedDate = params.date ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const view = params.view === "day" ? "day" : "week";
  const status = params.status ?? "";
  const bounds = weekBounds(new Date(selectedDate));
  const fromDate = view === "day" ? selectedDate : bounds.weekStart;
  const toDate = view === "day" ? selectedDate : bounds.weekEnd;

  const [visits, formOptions, routeData] = await Promise.all([
    listScheduleVisits({ fromDate, toDate }),
    listScheduleFormOptions(),
    getTodayRouteStops(),
  ]);
  const route = routeData.route;

  const grouped = visits.reduce<Record<string, typeof visits>>((acc, visit) => {
    const key = visit.scheduled_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(visit);
    return acc;
  }, {});
  const groupedDates = Object.keys(grouped).sort();

  const todayVisits = grouped[selectedDate] ?? [];
  const orderedVisitIds = routeData.stops
    .map((stop) => stop.service_visit_id)
    .filter(Boolean)
    .join(",");
  const delayedCandidates = todayVisits
    .filter((visit) => !["completed", "cancelled", "canceled"].includes(visit.status))
    .map((visit) => visit.id)
    .join(",");

  return (
    <div className="space-y-4">
      <PageHeader title="Schedule" description="Daily and weekly service visit planning with quick routing controls." />
      {status ? (
        status === "error" ? (
          <section className="rounded-2xl border border-[#c9a7a0] bg-[#f3e8e5] px-3 py-2 text-sm text-[#6b3329]">
            {params.message ?? "Action failed. Please retry."}
          </section>
        ) : (
          <section className="rounded-2xl border border-[#9eb29d] bg-[#e5ebe3] px-3 py-2 text-sm text-[#234f34]">
            {status.replaceAll("_", " ")} successful.
          </section>
        )
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a className={`rounded-lg border px-3 py-1.5 ${view === "day" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700"}`} href={`/schedule?view=day&date=${selectedDate}`}>Day</a>
          <a className={`rounded-lg border px-3 py-1.5 ${view === "week" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700"}`} href={`/schedule?view=week&date=${selectedDate}`}>Week</a>
          <form className="ml-auto" method="get" action="/schedule">
            <input type="hidden" name="view" value={view} />
            <input type="date" name="date" defaultValue={selectedDate} className="rounded-lg border border-zinc-300 px-2 py-1.5" />
            <button className="ml-2 rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold">Go</button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">Today&apos;s Route</h2>
          {route ? (
            <div className="mt-2 space-y-2 text-sm text-zinc-700">
              <p>Status: <span className="font-semibold text-zinc-900">{route.status}</span></p>
              <div className="flex gap-2">
                <form action={startRouteAction.bind(null, route.id)}>
                  <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold">Mark Started</button>
                </form>
                <form action={completeRouteAction.bind(null, route.id)}>
                  <button className="rounded-lg border border-[#93ab92] bg-[#dfe8dc] px-3 py-1.5 text-xs font-semibold text-[#234f34]">Mark Completed</button>
                </form>
              </div>
              <div className="rounded-lg border border-zinc-200 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Stop Order</p>
                {routeData.stops.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">No route stops yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {routeData.stops.map((stop) => {
                      const visit = stop.service_visits;
                      const property = visit?.properties ? (Array.isArray(visit.properties) ? visit.properties[0] : visit.properties) : null;
                      const client = property?.clients ? (Array.isArray(property.clients) ? property.clients[0] : property.clients) : null;
                      return (
                        <div key={stop.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 bg-zinc-50 p-2">
                          <div>
                            <p className="text-xs font-semibold text-zinc-900">{stop.stop_order}. {client?.full_name ?? "Stop"}</p>
                            <p className="text-[11px] text-zinc-600">{property?.street_1 ?? "-"}</p>
                          </div>
                          <div className="flex gap-1">
                            <form action={moveRouteStopUpAction.bind(null, route.id, stop.id)}>
                              <button className="min-h-10 min-w-10 rounded border border-zinc-300 bg-white px-2 text-sm font-semibold">↑</button>
                            </form>
                            <form action={moveRouteStopDownAction.bind(null, route.id, stop.id)}>
                              <button className="min-h-10 min-w-10 rounded border border-zinc-300 bg-white px-2 text-sm font-semibold">↓</button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                    <form action={reorderRouteAction.bind(null, route.id)}>
                      <input type="hidden" name="orderedVisitIds" value={orderedVisitIds} />
                      <button className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">Save Order</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-zinc-600">No route exists for today.</p>
              <form action={createTodayRouteAction} className="mt-2">
                <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold">Create Route from Today&apos;s Visits</button>
              </form>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">Quick Create Visit</h2>
          <form action={createVisitAction} className="mt-2 grid gap-2">
            <select name="propertyId" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" required>
              <option value="">Select property</option>
              {formOptions.properties.map((property) => {
                const client = Array.isArray(property.clients) ? property.clients[0] : property.clients;
                const address = [property.street_1, property.city, property.state].filter(Boolean).join(", ");
                return (
                  <option key={property.id} value={property.id}>
                    {client?.full_name ?? "Customer"} - {address}
                  </option>
                );
              })}
            </select>
            <select name="serviceTypeId" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" required>
              <option value="">Select service type</option>
              {formOptions.serviceTypes.map((serviceType) => (
                <option key={serviceType.id} value={serviceType.id}>{serviceType.label}</option>
              ))}
            </select>
            <select name="servicePlanId" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="">Optional plan</option>
              {formOptions.servicePlans.map((servicePlan) => (
                <option key={servicePlan.id} value={servicePlan.id}>{servicePlan.plan_name ?? "Plan"}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" name="scheduledDate" defaultValue={selectedDate} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" required />
              <input type="text" disabled value="Time slot TBD" className="rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-1.5 text-sm text-zinc-500" />
            </div>
            <input type="number" name="quotedPrice" min={0} defaultValue={0} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Price in cents" />
            <input name="notes" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Notes" />
            <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold">Create Visit</button>
          </form>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">Weather Delay / Bulk Reschedule</h2>
        <form action={bulkWeatherDelayAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input name="visitIds" defaultValue={delayedCandidates} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs" placeholder="Comma-separated visit IDs" />
          <div className="flex gap-2">
            <input type="date" name="newDate" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" required />
            <button className="rounded-lg border border-[#b7a978] bg-[#f1ecd8] px-3 py-1.5 text-xs font-semibold text-[#5d4f24]">Apply Weather Delay</button>
          </div>
        </form>
      </section>

      {groupedDates.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          No service visits in this date range.
        </section>
      ) : (
        <section className="space-y-3">
          {groupedDates.map((date) => (
            <article key={date} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">{dateLabel(date)}</h3>
              <div className="mt-2 space-y-2">
                {grouped[date].map((visit) => {
                  const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
                  const client = property?.clients ? (Array.isArray(property.clients) ? property.clients[0] : property.clients) : null;
                  return (
                    <div key={visit.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{client?.full_name ?? "Unassigned customer"}</p>
                          <p className="text-xs text-zinc-600">{[property?.street_1, property?.city, property?.state].filter(Boolean).join(", ")}</p>
                          <p className="text-xs text-zinc-600">
                            {(visit.scheduled_at
                              ? new Date(visit.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : `Slot ${visit.scheduled_position ?? "-"}`)}{" "}
                            • {visit.service_types ? (Array.isArray(visit.service_types) ? visit.service_types[0]?.label : visit.service_types?.label) : "Service"}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(visit.status)}`}>
                          {visit.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="font-semibold text-zinc-800">{formatCurrencyFromCents(visit.quoted_price ?? 0)}</span>
                        <a href={`/service-visits/${visit.id}`} className="rounded border border-zinc-300 px-2 py-1 font-semibold text-zinc-700">Open</a>
                        <form action={quickRescheduleAction.bind(null, visit.id)} className="flex items-center gap-1">
                          <input type="date" name="scheduledDate" className="rounded border border-zinc-300 px-1.5 py-1" required />
                          <button className="rounded border border-zinc-300 px-2 py-1 font-semibold text-zinc-700">Reschedule</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
