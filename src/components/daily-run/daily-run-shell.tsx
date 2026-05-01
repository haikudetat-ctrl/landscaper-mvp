"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";

import {
  completeRunVisitAction,
  completeRunVisitWithPhotoAction,
  markRunPaymentCollectedAction,
  removeRunVisitFromTodayAction,
  skipRunVisitAction,
} from "@/app/(app)/run/actions";
import { trackEvent } from "@/lib/analytics";
import type { CollectionInvoice, DailyRunData, DailyRunVisit, YesterdaySummary } from "@/lib/db/daily-run";
import { buildExternalNavigationLinks } from "@/lib/maps/navigation";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

type RunPhase = "morning" | "confirm" | "ready" | "running" | "summary" | "collections";
type RunState = "planning" | "ready" | "running" | "wrapping" | "closed";
type RouteSummary = { distance?: number; duration?: number } | null;

const terminalStatuses = new Set(["completed", "skipped", "canceled"]);
const skipReasons = [
  { value: "rain/weather", label: "Rain/weather" },
  { value: "access issue", label: "Access issue" },
  { value: "customer canceled", label: "Customer canceled" },
  { value: "equipment issue", label: "Equipment issue" },
  { value: "other", label: "Other" },
];

function deriveRunState(phase: RunPhase, visits: DailyRunVisit[]): RunState {
  const unresolved = visits.filter((visit) => !terminalStatuses.has(visit.visit_status ?? ""));
  if (phase === "collections") return "closed";
  if (unresolved.length === 0 && visits.length > 0) return "wrapping";
  if (phase === "running") return "running";
  if (phase === "ready") return "ready";
  return "planning";
}

function distanceLabel(meters?: number) {
  if (!meters) return "Route distance unavailable";
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function durationLabel(seconds?: number) {
  if (!seconds) return "Drive time unavailable";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

function mapsUrl(visit: DailyRunVisit) {
  const destination =
    typeof visit.latitude === "number" && typeof visit.longitude === "number"
      ? { latitude: visit.latitude, longitude: visit.longitude }
      : [visit.street_1, visit.city, visit.state, visit.postal_code].filter(Boolean).join(" ");
  return buildExternalNavigationLinks({ stops: [destination] }).googleMapsUrl ?? `https://maps.google.com/?q=${encodeURIComponent(String(destination))}`;
}

function updateVisitStatus(visits: DailyRunVisit[], visitId: string, status: string, extras?: Partial<DailyRunVisit>) {
  return visits.map((visit) =>
    visit.service_visit_id === visitId
      ? {
          ...visit,
          ...extras,
          visit_status: status,
        }
      : visit,
  );
}

export function DailyRunShell({ data }: { data: DailyRunData }) {
  const [phase, setPhase] = useState<RunPhase>("morning");
  const [visits, setVisits] = useState(data.visits);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(
    data.visits.find((visit) => !terminalStatuses.has(visit.visit_status ?? ""))?.service_visit_id ?? null,
  );
  const [routeSummary, setRouteSummary] = useState<RouteSummary>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isRouting, startRoutingTransition] = useTransition();
  const [isMutating, startMutationTransition] = useTransition();
  const [skipVisit, setSkipVisit] = useState<DailyRunVisit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeIndex = useMemo(() => {
    if (!activeVisitId) return -1;
    return visits.findIndex((visit) => visit.service_visit_id === activeVisitId);
  }, [activeVisitId, visits]);

  const actionableVisits = useMemo(
    () => visits.filter((visit) => !terminalStatuses.has(visit.visit_status ?? "")),
    [visits],
  );
  const activeVisit = activeIndex >= 0 ? visits[activeIndex] : actionableVisits[0] ?? null;
  const completedCount = visits.filter((visit) => visit.visit_status === "completed").length;
  const skippedCount = visits.filter((visit) => visit.visit_status === "skipped").length;
  const photosAttachedCount = visits.reduce((sum, visit) => sum + visit.photo_count, 0);
  const completedRevenue = visits.reduce((sum, visit) => {
    if (visit.visit_status !== "completed") return sum;
    return sum + (visit.quoted_price ?? 0);
  }, 0);
  const unresolvedCount = visits.filter((visit) => !terminalStatuses.has(visit.visit_status ?? "")).length;
  const runState = deriveRunState(phase, visits);

  function openPhase(nextPhase: RunPhase, eventName?: string) {
    setPhase(nextPhase);
    if (eventName) trackEvent(eventName, { visit_count: visits.length });
  }

  function advanceFrom(visitId: string) {
    const next = visits.find((visit) => visit.service_visit_id !== visitId && !terminalStatuses.has(visit.visit_status ?? ""));
    setActiveVisitId(next?.service_visit_id ?? null);
    if (!next) {
      setPhase("summary");
      trackEvent("run_completed", { completed_count: completedCount + 1, skipped_count: skippedCount });
    }
  }

  function generateRoute() {
    const coordinates = visits
      .filter((visit) => !terminalStatuses.has(visit.visit_status ?? "") && visit.latitude && visit.longitude)
      .map((visit) => ({
        id: visit.service_visit_id ?? visit.property_id ?? `${visit.latitude},${visit.longitude}`,
        label: visit.client_name,
        address: formatAddress(visit),
        latitude: visit.latitude as number,
        longitude: visit.longitude as number,
      }));

    setRouteError(null);
    trackEvent("route_generation_requested", { coordinate_count: coordinates.length });

    if (coordinates.length < 2) {
      setRouteSummary(null);
      setRouteError("At least two geocoded properties are needed for route generation.");
      return;
    }

    startRoutingTransition(async () => {
      try {
        const response = await fetch("/api/properties/route-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stops: coordinates }),
        });
        const payload = (await response.json()) as { summary?: RouteSummary; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to generate route.");
        setRouteSummary(payload.summary ?? null);
        trackEvent("route_generation_completed", { coordinate_count: coordinates.length });
      } catch (routePlanError) {
        setRouteError(routePlanError instanceof Error ? routePlanError.message : "Unable to generate route.");
      }
    });
  }

  function completeVisit(visit: DailyRunVisit) {
    if (!visit.service_visit_id) return;
    const previousVisits = visits;
    setError(null);
    setVisits(updateVisitStatus(visits, visit.service_visit_id, "completed"));
    trackEvent("visit_completed", { visit_id: visit.service_visit_id });

    startMutationTransition(async () => {
      try {
        await completeRunVisitAction(visit.service_visit_id as string);
        advanceFrom(visit.service_visit_id as string);
      } catch (mutationError) {
        setVisits(previousVisits);
        setError(mutationError instanceof Error ? mutationError.message : "Unable to complete visit.");
      }
    });
  }

  function completeVisitWithPhoto(visit: DailyRunVisit, formData: FormData) {
    if (!visit.service_visit_id) return;
    const previousVisits = visits;
    setError(null);
    setVisits(updateVisitStatus(visits, visit.service_visit_id, "completed", { photo_count: visit.photo_count + 1 }));
    trackEvent("visit_completed_with_photo", { visit_id: visit.service_visit_id });

    startMutationTransition(async () => {
      try {
        await completeRunVisitWithPhotoAction(visit.service_visit_id as string, formData);
        advanceFrom(visit.service_visit_id as string);
      } catch (mutationError) {
        setVisits(previousVisits);
        setError(mutationError instanceof Error ? mutationError.message : "Unable to complete visit with photo.");
      }
    });
  }

  function skipActiveVisit(reason: string, note: string | null) {
    if (!skipVisit?.service_visit_id) return;
    const previousVisits = visits;
    const visitId = skipVisit.service_visit_id;
    setSkipVisit(null);
    setError(null);
    setVisits(updateVisitStatus(visits, visitId, "skipped", { operator_notes: note ?? reason }));
    trackEvent("visit_skipped", { visit_id: visitId, reason });

    startMutationTransition(async () => {
      try {
        await skipRunVisitAction(visitId, reason, note);
        advanceFrom(visitId);
      } catch (mutationError) {
        setVisits(previousVisits);
        setError(mutationError instanceof Error ? mutationError.message : "Unable to skip visit.");
      }
    });
  }

  function removeFromToday(visit: DailyRunVisit) {
    if (!visit.service_visit_id) return;
    const previousVisits = visits;
    const nextVisits = visits.filter((currentVisit) => currentVisit.service_visit_id !== visit.service_visit_id);

    setError(null);
    setRouteSummary(null);
    setRouteError(null);
    setVisits(nextVisits);
    if (activeVisitId === visit.service_visit_id) {
      setActiveVisitId(nextVisits.find((currentVisit) => !terminalStatuses.has(currentVisit.visit_status ?? ""))?.service_visit_id ?? null);
    }
    trackEvent("run_visit_removed_from_today", { visit_id: visit.service_visit_id, is_missed_appointment: visit.is_missed_appointment });

    startMutationTransition(async () => {
      try {
        await removeRunVisitFromTodayAction(visit.service_visit_id as string);
      } catch (mutationError) {
        setVisits(previousVisits);
        setError(mutationError instanceof Error ? mutationError.message : "Unable to remove this visit from today's run.");
      }
    });
  }

  function openMaps(visit: DailyRunVisit) {
    trackEvent("maps_opened", { visit_id: visit.service_visit_id });
    window.open(mapsUrl(visit), "_blank", "noopener,noreferrer");
  }

  return (
    <DailyRunLayout runState={runState} today={data.today} error={error} isMutating={isMutating}>
      {phase === "morning" ? (
        <YesterdaySummaryCard
          summary={data.yesterday}
          onContinue={() => {
            trackEvent("yesterday_summary_viewed", { completed_visits: data.yesterday.completedVisits });
            openPhase("confirm", "mobile_run_opened");
          }}
        />
      ) : null}

      {phase === "confirm" ? (
        <TodayConfirmationList
          visits={visits}
          isMutating={isMutating}
          onRemoveFromToday={removeFromToday}
          onConfirm={() => openPhase("ready", "today_jobs_confirmed")}
        />
      ) : null}

      {phase === "ready" ? (
        <RouteReadyCard
          visits={visits}
          routeSummary={routeSummary}
          routeError={routeError}
          isRouting={isRouting}
          onGenerateRoute={generateRoute}
          onStart={() => {
            setActiveVisitId(actionableVisits[0]?.service_visit_id ?? null);
            openPhase("running", "run_started");
            if (actionableVisits[0]?.service_visit_id) {
              trackEvent("visit_opened", { visit_id: actionableVisits[0].service_visit_id });
            }
          }}
        />
      ) : null}

      {phase === "running" ? (
        activeVisit ? (
          <ActiveJobCard
            visit={activeVisit}
            activeNumber={activeIndex + 1}
            total={visits.length}
            isMutating={isMutating}
            onComplete={completeVisit}
            onCompleteWithPhoto={completeVisitWithPhoto}
            onSkip={setSkipVisit}
            onOpenMaps={openMaps}
            onNext={() => advanceFrom(activeVisit.service_visit_id ?? "")}
          />
        ) : (
          <EndOfDaySummary
            completedCount={completedCount}
            skippedCount={skippedCount}
            completedRevenue={completedRevenue}
            photosAttachedCount={photosAttachedCount}
            unresolvedCount={unresolvedCount}
            collections={data.collections}
            onCollections={() => openPhase("collections", "collections_viewed")}
          />
        )
      ) : null}

      {phase === "summary" ? (
        <EndOfDaySummary
          completedCount={completedCount}
          skippedCount={skippedCount}
          completedRevenue={completedRevenue}
          photosAttachedCount={photosAttachedCount}
          unresolvedCount={unresolvedCount}
          collections={data.collections}
          onCollections={() => openPhase("collections", "collections_viewed")}
        />
      ) : null}

      {phase === "collections" ? <CollectionsPanel collections={data.collections} /> : null}

      {skipVisit ? (
        <SkipReasonSheet
          visit={skipVisit}
          onClose={() => setSkipVisit(null)}
          onSkip={skipActiveVisit}
        />
      ) : null}
    </DailyRunLayout>
  );
}

function DailyRunLayout({
  children,
  runState,
  today,
  error,
  isMutating,
}: {
  children: React.ReactNode;
  runState: RunState;
  today: string;
  error: string | null;
  isMutating: boolean;
}) {
  return (
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-3xl bg-[#f6faf7] md:rounded-2xl md:border md:border-emerald-200 md:shadow-sm">
      <div className="sticky top-[57px] z-20 border-b border-emerald-100 bg-white/95 px-4 py-3 backdrop-blur md:top-0 md:rounded-t-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Daily Run</p>
            <h1 className="text-lg font-bold text-zinc-950">{formatDate(today)}</h1>
          </div>
          <div className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold capitalize text-white">
            {runState}
          </div>
        </div>
        {isMutating ? <p className="mt-2 text-xs font-semibold text-emerald-700">Saving...</p> : null}
        {error ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{error}</p> : null}
      </div>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </div>
  );
}

export function YesterdaySummaryCard({
  summary,
  onContinue,
}: {
  summary: YesterdaySummary;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Morning Review</p>
        <h2 className="mt-1 text-2xl font-bold text-zinc-950">Yesterday at a glance</h2>
        <p className="mt-1 text-sm text-zinc-600">{formatDate(summary.date)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Completed" value={summary.completedVisits.toString()} />
          <Metric label="Skipped" value={summary.skippedVisits.toString()} />
          <Metric label="Revenue done" value={formatCurrencyFromCents(summary.revenueCompleted)} />
          <Metric label="Collections" value={formatCurrencyFromCents(summary.pendingCollectionsAmount)} />
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-900">Notable issues</h3>
        {summary.notableIssues.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No skipped-visit issues were found yesterday.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {summary.notableIssues.map((issue) => (
              <div key={issue.id} className="rounded-xl bg-amber-50 px-3 py-2">
                <p className="text-sm font-semibold text-zinc-900">{issue.clientName ?? "Client"}</p>
                <p className="text-xs text-zinc-600">{issue.address || "Address missing"}</p>
                <p className="mt-1 text-xs font-semibold text-amber-800">{issue.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={onContinue} className="h-14 w-full rounded-2xl bg-zinc-900 text-base font-bold text-white shadow-sm">
        Review Today&apos;s Jobs
      </button>
    </section>
  );
}

export function TodayConfirmationList({
  visits,
  isMutating,
  onRemoveFromToday,
  onConfirm,
}: {
  visits: DailyRunVisit[];
  isMutating: boolean;
  onRemoveFromToday: (visit: DailyRunVisit) => void;
  onConfirm: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Job Confirmation</p>
        <h2 className="mt-1 text-2xl font-bold text-zinc-950">Today&apos;s run list</h2>
        <p className="mt-1 text-sm text-zinc-600">{visits.length} visits ready for today&apos;s run.</p>
      </div>

      <div className="space-y-2">
        {visits.length === 0 ? (
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 text-sm text-zinc-600">No visits are scheduled for today.</div>
        ) : (
          visits.map((visit, index) => (
            <div key={visit.service_visit_id ?? index} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Stop {index + 1}</p>
                  <h3 className="mt-1 text-base font-bold text-zinc-950">{visit.client_name ?? "No client"}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{formatAddress(visit)}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold capitalize text-zinc-700">
                  {visit.visit_status ?? "scheduled"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-zinc-700">{visit.service_type_label ?? "Service"}</span>
                <span className="font-semibold text-zinc-950">{formatCurrencyFromCents(visit.quoted_price)}</span>
              </div>
              {visit.is_missed_appointment ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Missed backlog</p>
              ) : null}
              <button
                type="button"
                onClick={() => onRemoveFromToday(visit)}
                disabled={isMutating}
                className="mt-3 h-11 w-full rounded-2xl border border-amber-200 bg-white text-sm font-bold text-amber-800 shadow-sm disabled:opacity-60"
              >
                Remove from today&apos;s run
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={visits.length === 0 || isMutating}
        className="h-14 w-full rounded-2xl bg-zinc-900 text-base font-bold text-white shadow-sm disabled:opacity-60"
      >
        Confirm Jobs
      </button>
    </section>
  );
}

export function RouteReadyCard({
  visits,
  routeSummary,
  routeError,
  isRouting,
  onGenerateRoute,
  onStart,
}: {
  visits: DailyRunVisit[];
  routeSummary: RouteSummary;
  routeError: string | null;
  isRouting: boolean;
  onGenerateRoute: () => void;
  onStart: () => void;
}) {
  const geocodedCount = visits.filter((visit) => visit.latitude && visit.longitude).length;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Route Ready</p>
        <h2 className="mt-1 text-2xl font-bold text-zinc-950">Generate the route</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {geocodedCount}/{visits.length} stops have coordinates. Mapbox optimization is used when configured, with OSM fallback preserved.
        </p>
        {routeSummary ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric label="Distance" value={distanceLabel(routeSummary.distance)} />
            <Metric label="Drive time" value={durationLabel(routeSummary.duration)} />
          </div>
        ) : null}
        {routeError ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{routeError}</p> : null}
      </div>

      <button
        type="button"
        onClick={onGenerateRoute}
        disabled={isRouting}
        className="h-13 w-full rounded-2xl border border-emerald-300 bg-white text-base font-bold text-zinc-900 shadow-sm disabled:opacity-60"
      >
        {isRouting ? "Generating..." : "Generate Route"}
      </button>
      <button type="button" onClick={onStart} className="h-16 w-full rounded-2xl bg-emerald-700 text-lg font-bold text-white shadow-sm">
        Start Run
      </button>
    </section>
  );
}

export function ActiveJobCard({
  visit,
  activeNumber,
  total,
  isMutating,
  onComplete,
  onCompleteWithPhoto,
  onSkip,
  onOpenMaps,
  onNext,
}: {
  visit: DailyRunVisit;
  activeNumber: number;
  total: number;
  isMutating: boolean;
  onComplete: (visit: DailyRunVisit) => void;
  onCompleteWithPhoto: (visit: DailyRunVisit, formData: FormData) => void;
  onSkip: (visit: DailyRunVisit) => void;
  onOpenMaps: (visit: DailyRunVisit) => void;
  onNext: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Active Run · Stop {Math.max(activeNumber, 1)} of {total}
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-zinc-950">{visit.client_name ?? "No client"}</h2>
          </div>
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold capitalize text-white">
            {visit.visit_status ?? "scheduled"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Property</p>
            <p className="mt-1 text-lg font-bold text-zinc-950">{formatAddress(visit)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Service" value={visit.service_type_label ?? "Service"} />
            <Metric label="Value" value={formatCurrencyFromCents(visit.quoted_price)} />
          </div>
          <NotesBlock title="Access" value={[visit.access_notes, visit.gate_notes].filter(Boolean).join(" ")} />
          <NotesBlock title="Service notes" value={[visit.service_notes, visit.operator_notes].filter(Boolean).join(" ")} />
        </div>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isMutating}
          className="h-14 rounded-2xl bg-emerald-700 text-base font-bold text-white shadow-sm disabled:opacity-60"
        >
          Complete + Attach Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.set("photoFile", file);
            formData.set("caption", "Mobile run completion photo");
            onCompleteWithPhoto(visit, formData);
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => onComplete(visit)}
          disabled={isMutating}
          className="h-14 rounded-2xl border border-emerald-300 bg-white text-base font-bold text-emerald-800 shadow-sm disabled:opacity-60"
        >
          Complete Without Photo
        </button>
        <button
          type="button"
          onClick={() => onSkip(visit)}
          disabled={isMutating}
          className="h-14 rounded-2xl border border-amber-300 bg-amber-50 text-base font-bold text-amber-900 shadow-sm disabled:opacity-60"
        >
          Skip With Reason
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenMaps(visit)}
            className="h-13 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-900 shadow-sm"
          >
            Open in Maps
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-13 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-900 shadow-sm"
          >
            Next Job
          </button>
        </div>
      </div>
    </section>
  );
}

export function SkipReasonSheet({
  visit,
  onClose,
  onSkip,
}: {
  visit: DailyRunVisit;
  onClose: () => void;
  onSkip: (reason: string, note: string | null) => void;
}) {
  const [reason, setReason] = useState(skipReasons[0]?.value ?? "other");
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-zinc-950/45 px-4 pb-4 md:items-center md:justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Skip Visit</p>
        <h2 className="mt-1 text-xl font-bold text-zinc-950">{visit.client_name ?? "No client"}</h2>
        <div className="mt-4 grid gap-2">
          {skipReasons.map((skipReason) => (
            <label key={skipReason.value} className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-3 py-3 text-sm font-semibold">
              <input
                type="radio"
                name="skipReason"
                value={skipReason.value}
                checked={reason === skipReason.value}
                onChange={() => setReason(skipReason.value)}
              />
              {skipReason.label}
            </label>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          className="mt-3 min-h-24 w-full rounded-2xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-zinc-300 bg-white text-sm font-bold text-zinc-900">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSkip(reason, note.trim() || null)}
            className="h-12 rounded-2xl bg-amber-600 text-sm font-bold text-white"
          >
            Skip Visit
          </button>
        </div>
      </div>
    </div>
  );
}

export function EndOfDaySummary({
  completedCount,
  skippedCount,
  completedRevenue,
  photosAttachedCount,
  unresolvedCount,
  collections,
  onCollections,
}: {
  completedCount: number;
  skippedCount: number;
  completedRevenue: number;
  photosAttachedCount: number;
  unresolvedCount: number;
  collections: CollectionInvoice[];
  onCollections: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">End of Day Summary</p>
        <h2 className="mt-1 text-2xl font-bold text-zinc-950">Run wrapped</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Completed" value={completedCount.toString()} />
          <Metric label="Skipped" value={skippedCount.toString()} />
          <Metric label="Revenue" value={formatCurrencyFromCents(completedRevenue)} />
          <Metric label="Photos" value={photosAttachedCount.toString()} />
        </div>
        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
          Unresolved visits: {unresolvedCount}
        </p>
      </div>
      <button type="button" onClick={onCollections} className="h-14 w-full rounded-2xl bg-zinc-900 text-base font-bold text-white shadow-sm">
        Review Collections ({collections.length})
      </button>
      <Link href="/" className="block h-12 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-bold text-zinc-900">
        Back to Dashboard
      </Link>
    </section>
  );
}

export function CollectionsPanel({ collections }: { collections: CollectionInvoice[] }) {
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function markCollected(invoice: CollectionInvoice, method: string) {
    if (!invoice.invoice_id) return;
    setPendingInvoiceId(invoice.invoice_id);
    setError(null);
    const formData = new FormData();
    formData.set("invoiceId", invoice.invoice_id);
    formData.set("method", method);
    formData.set("amount", String(invoice.amount_remaining ?? 0));
    formData.set("reference", `Mobile run ${method} collection`);
    trackEvent("payment_marked_collected", { invoice_id: invoice.invoice_id, method });

    startTransition(async () => {
      try {
        await markRunPaymentCollectedAction(formData);
      } catch (paymentError) {
        setError(paymentError instanceof Error ? paymentError.message : "Unable to mark payment collected.");
      } finally {
        setPendingInvoiceId(null);
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Collections</p>
        <h2 className="mt-1 text-2xl font-bold text-zinc-950">Pending money</h2>
        <p className="mt-1 text-sm text-zinc-600">Invoices and payments exist, so manual collection can be recorded here.</p>
      </div>

      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{error}</p> : null}

      {collections.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 text-sm text-zinc-600">No unpaid collections found.</div>
      ) : (
        collections.map((invoice) => (
          <div key={invoice.invoice_id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">#{invoice.invoice_number ?? "Invoice"}</h3>
                <p className="mt-1 text-sm text-zinc-600">{invoice.client_name ?? "No client"}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatAddress(invoice)}</p>
              </div>
              <p className="text-lg font-bold text-zinc-950">{formatCurrencyFromCents(invoice.amount_remaining)}</p>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {["cash", "check", "venmo", "other"].map((method) => (
                <button
                  key={method}
                  type="button"
                  disabled={isPending || pendingInvoiceId === invoice.invoice_id}
                  onClick={() => markCollected(invoice, method)}
                  className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold capitalize text-emerald-900 disabled:opacity-60"
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-1 text-base font-bold text-zinc-950">{value}</p>
    </div>
  );
}

function NotesBlock({ title, value }: { title: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-800">{value}</p>
    </div>
  );
}
