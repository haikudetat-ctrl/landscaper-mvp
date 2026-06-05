"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { DashboardData } from "@/lib/db/dashboard";
import { formatAddress, formatCurrencyFromCents } from "@/lib/utils/format";
import { deriveCanonicalState, getPrimaryActionLabel } from "@/lib/workflows/today-visit-workflow";

type SearchSuggestion = {
  id: string;
  href: string;
  title: string;
  path: string;
  subtitle?: string;
};

export function MobileHomeDashboard({
  data,
  advanceNextJobAction,
}: {
  data: DashboardData;
  advanceNextJobAction?: (formData: FormData) => Promise<void>;
}) {
  const mobile = data.mobile;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isShiftingWeather, setIsShiftingWeather] = useState(false);
  const [weatherShiftMessage, setWeatherShiftMessage] = useState<string | null>(null);
  const [weatherShiftError, setWeatherShiftError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/search/global?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return { suggestions: [] as SearchSuggestion[] };
        return (await response.json()) as { suggestions?: SearchSuggestion[] };
      })
      .then((result) => {
        setSuggestions(result.suggestions ?? []);
      })
      .catch(() => {
        setSuggestions([]);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const nextJobHref = useMemo(() => {
    if (!mobile.nextJob) return "/today";
    if (mobile.nextJob.propertyId) return `/properties/${mobile.nextJob.propertyId}`;
    return `/service-visits/${mobile.nextJob.visitId}`;
  }, [mobile.nextJob]);

  const nextJobMapUrl = useMemo(() => {
    if (!mobile.nextJob) return "#";
    const queryValue = [mobile.nextJob.street_1, mobile.nextJob.city, mobile.nextJob.state, mobile.nextJob.postal_code]
      .filter(Boolean)
      .join(" ");
    return `https://maps.google.com/?q=${encodeURIComponent(queryValue)}`;
  }, [mobile.nextJob]);
  const nextJobData = useMemo(() => {
    if (!mobile.nextJob) return null;
    const match = data.todayJobs.find((job) => job.service_visit_id === mobile.nextJob?.visitId) ?? null;
    const position = Math.max(
      1,
      data.todayJobs.findIndex((job) => job.service_visit_id === mobile.nextJob?.visitId) + 1,
    );
    const state = deriveCanonicalState({
      status: match?.visit_status ?? "scheduled",
      invoiceStatus: null,
    });
    return {
      match,
      state,
      position,
      nextAction: getPrimaryActionLabel(state),
    };
  }, [data.todayJobs, mobile.nextJob]);

  const todayFilter = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);
  const weatherRangeLabel =
    mobile.weather?.tempLow != null && mobile.weather?.tempHigh != null
      ? `${mobile.weather.tempLow}\u00b0-${mobile.weather.tempHigh}\u00b0`
      : mobile.weather?.tempHigh != null
        ? `High ${mobile.weather.tempHigh}\u00b0`
        : mobile.weather?.tempLow != null
          ? `Low ${mobile.weather.tempLow}\u00b0`
          : null;

  const fixedCardClass = "h-[clamp(104px,15vh,140px)] rounded-2xl border-[0.5px] border-[#a5b6a4] p-2.5 shadow-sm";
  const cardCyanClass = "bg-[#f3f6f1]";
  const iconClass = "mt-0.5 h-[2.1875rem] w-[2.1875rem] shrink-0";

  async function confirmWeatherSkip() {
    setIsShiftingWeather(true);
    setWeatherShiftError(null);
    setWeatherShiftMessage(null);

    try {
      const response = await fetch("/api/service-visits/rain-delay-today", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceDate: todayFilter,
          reason: "Weather day skip from mobile dashboard",
        }),
      });

      const payload = (await response.json()) as { shiftedCount?: number; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to shift today's jobs");
      }

      setWeatherShiftMessage(`Shifted ${payload.shiftedCount ?? 0} jobs to tomorrow.`);
      setIsWeatherModalOpen(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to shift today's jobs";
      setWeatherShiftError(message);
    } finally {
      setIsShiftingWeather(false);
    }
  }

  return (
    <div className="-mx-4 -mt-[15px] md:hidden">
      <div className="grid min-h-[calc(100dvh-8.25rem)] grid-rows-[auto_1fr_auto] bg-gradient-to-br from-[#1f4d33] via-[#2a6540] to-[#6f9950]">
        <section className="relative px-4 pt-[5px] pb-3">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f7a61]"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M10 3a7 7 0 1 0 4.6 12.3l4 4a1 1 0 0 0 1.4-1.4l-4-4A7 7 0 0 0 10 3m0 2a5 5 0 1 1 0 10a5 5 0 0 1 0-10"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clients, properties, visits, invoices..."
              className="w-full rounded-xl border border-[#a5b6a4] bg-[#f4f7f3] py-2.5 pl-10 pr-10 text-sm text-[#223429] outline-none shadow-[0_10px_20px_-16px_rgba(23,41,29,0.38)] focus:border-[#2f6f43] focus:bg-white"
            />
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f7a61]"
              aria-hidden="true"
            >
              <path fill="currentColor" d="M7 5h10v2H7zm0 6h10v2H7zm0 6h7v2H7z" />
            </svg>
          </div>

          {query.trim().length >= 2 ? (
              <div className="absolute left-4 right-4 top-[calc(100%-16px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-[#a5b6a4] bg-[#f6f8f4] shadow-lg">
              {suggestions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#666666]">No matches found</div>
              ) : (
                suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.id}
                    href={suggestion.href}
                    onClick={() => {
                      setQuery("");
                      setSuggestions([]);
                    }}
                    className="block border-b border-zinc-100 px-3 py-2 last:border-b-0"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
                      {suggestion.path}
                    </div>
                    <div className="text-sm font-medium text-[#666666]">{suggestion.title}</div>
                    {suggestion.subtitle ? (
                      <div className="text-xs text-[#666666]">{suggestion.subtitle}</div>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </section>

        <section className="overflow-y-auto bg-white px-[18px] pt-[14px] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="space-y-2.5">
            <article className="rounded-2xl border border-[#93ab92] bg-gradient-to-br from-[#f3f7f1] via-[#edf3eb] to-[#e7efe3] p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4a6050]">Next Job</p>
                  <p className="text-sm font-semibold text-[#172119]">
                    {nextJobData?.match?.client_name ?? (mobile.nextJob ? "Current Route Stop" : "No active stop")}
                  </p>
                  <p className="text-xs text-[#4a6050]">
                    {nextJobData?.match?.service_type_label ?? (mobile.nextJob ? "Scheduled service" : "Today is clear")}
                  </p>
                </div>
                <span className="rounded-full border border-[#8da195] bg-[#dce6d9] px-2 py-1 text-[10px] font-semibold text-[#20372b]">
                  {mobile.nextJob ? `${nextJobData?.position ?? 1} of ${Math.max(mobile.todayTotalJobs, 1)}` : "No Route"}
                </span>
              </div>

              <p className="mt-2 text-xs text-[#33463a]">
                {mobile.nextJob
                  ? [mobile.nextJob.street_1, mobile.nextJob.city, mobile.nextJob.state, mobile.nextJob.postal_code].filter(Boolean).join(", ")
                  : "No scheduled jobs for this route state. Check schedule or create today’s route."}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-[#8ea296] bg-[#d4ddd8] px-2 py-1 font-semibold text-[#20372b]">
                  {mobile.nextJob ? nextJobData?.state.replaceAll("_", " ") : "idle"}
                </span>
                <span className="rounded-full border border-[#a9b9a8] bg-[#e6ece4] px-2 py-1 font-medium text-[#33463a]">
                  Next action: {mobile.nextJob ? nextJobData?.nextAction : mobile.todayTotalJobs > 0 ? "Start Today’s Route" : "Review Schedule"}
                </span>
                {mobile.overdueVisitCount > 0 ? (
                  <span className="rounded-full border border-[#b7a978] bg-[#ede4c9] px-2 py-1 font-semibold text-[#4d421d]">
                    Follow-ups: {mobile.overdueVisitCount}
                  </span>
                ) : null}
                <span className="rounded-full border border-[#a5b6a4] bg-white px-2 py-1 font-medium text-[#33463a]">
                  Expected: {formatCurrencyFromCents(mobile.nextJob?.quotedPrice ?? 0)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {mobile.nextJob && advanceNextJobAction ? (
                  <form action={advanceNextJobAction}>
                    <input type="hidden" name="visitId" value={mobile.nextJob.visitId} />
                    <button
                      type="submit"
                      className="min-h-11 w-full rounded-xl border border-[#2f6f43] bg-[#2f6f43] px-3 py-2 text-center text-sm font-semibold text-white"
                    >
                      {nextJobData?.nextAction ?? "Advance Job"}
                    </button>
                  </form>
                ) : (
                  <Link href="/today" className="min-h-11 rounded-xl border border-[#2f6f43] bg-[#2f6f43] px-3 py-2 text-center text-sm font-semibold text-white">
                    Open Today
                  </Link>
                )}
                <a
                  href={nextJobMapUrl}
                  className="min-h-11 rounded-xl border border-[#93ab92] bg-white px-3 py-2 text-center text-sm font-semibold text-[#20372b]"
                >
                  Open Maps
                </a>
              </div>
            </article>

            <div className="grid h-full grid-cols-2 gap-2.5">
            <div
              role="button"
              tabIndex={0}
              onClick={() => router.push(nextJobHref)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(nextJobHref);
                }
              }}
              className={`${fixedCardClass} ${cardCyanClass}`}
            >
              <div className="flex h-full flex-col">
                <div className="flex flex-[2] gap-2">
                  <img src="/LOAM_Mower_Icon_Evergreen.svg" alt="Next Job" className={iconClass} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">Next Job</p>
                    <a
                      href={nextJobMapUrl}
                      onClick={(event) => event.stopPropagation()}
                      className="text-[13px] font-semibold leading-4 text-[#666666] underline"
                    >
                      {formatAddress(mobile.nextJob ?? {})}
                    </a>
                  </div>
                </div>
                <div className="mt-1 border-t border-zinc-200 pt-1 text-[12px] font-medium text-[#666666]">
                  Job Value: {formatCurrencyFromCents(mobile.nextJob?.quotedPrice ?? 0)}
                </div>
              </div>
            </div>

            <Link
              href="/today"
              className={`${fixedCardClass} block ${mobile.overdueVisitCount > 0 ? "border border-[#cc9933] bg-[#ffffcc]" : cardCyanClass}`}
            >
              <div className="flex h-full flex-col">
                <div className="flex flex-[2] items-start gap-2">
                  <img src="/LOAM_ThumbsUp_Icon_Evergreen.svg" alt="Today's Jobs" className={iconClass} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">Today&apos;s Jobs</p>
                    <p className="text-[13px] font-semibold leading-4 text-[#666666]">
                      {mobile.todayCompletedJobs}/{mobile.todayTotalJobs}
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-4 text-[#666666]">
                      Expected: {formatCurrencyFromCents(mobile.todayExpectedRevenue)}
                    </p>
                  </div>
                </div>
                <div className="mt-1 border-t border-zinc-200 pt-1 text-[12px] font-medium">
                  {mobile.overdueVisitCount > 0 ? (
                    <span className="text-[#cc9933]">Missed: {mobile.overdueVisitCount}</span>
                  ) : (
                    <span className="text-[#666666]">No missed appointments</span>
                  )}
                </div>
              </div>
            </Link>

            <Link href="/invoices?status=overdue" className={`${fixedCardClass} ${cardCyanClass}`}>
              <div className="flex h-full flex-col">
                <div className="flex flex-[2] gap-2">
                  <img src="/LOAM_Icon_Evergreen.svg" alt="Invoices" className={iconClass} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">Invoices</p>
                    <p className="text-[13px] font-semibold leading-4 text-[#666666]">Unpaid: {mobile.unpaidInvoiceCount}</p>
                    <p className="text-[13px] font-semibold leading-4 text-[#666666]">Overdue: {mobile.overdueInvoiceCount}</p>
                  </div>
                </div>
                <div className="mt-1 border-t border-zinc-200 pt-1 text-[12px] font-medium text-[#666666]">
                  Remaining {formatCurrencyFromCents(mobile.unpaidAmount)}
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setWeatherShiftError(null);
                setIsWeatherModalOpen(true);
              }}
              disabled={isShiftingWeather}
              className={`${fixedCardClass} ${cardCyanClass} text-[13px] font-semibold text-[#666666] disabled:opacity-70`}
            >
              <div className="flex h-full items-start gap-2">
                <img src="/LOAM_WeatherSkip_Icon_Evergreen.svg" alt="Weather Day Skip" className={iconClass} />
                <div className="pt-0.5 text-left">
                  <p>{isShiftingWeather ? "Shifting..." : "Weather Day Skip Button"}</p>
                  {mobile.weather ? (
                    <p className="mt-0.5 text-[11px] font-medium text-[#666666]">
                      <span className="mr-1" aria-hidden="true">
                        {mobile.weather.icon}
                      </span>
                      {weatherRangeLabel ? `${weatherRangeLabel} ` : ""}
                      {mobile.weather.label}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>

            {weatherShiftMessage ? (
              <p className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-sm rounded-xl bg-emerald-50 px-2 py-1 text-[11px] font-medium text-[#666666] shadow">
                {weatherShiftMessage}
              </p>
            ) : null}
          </div>
          </div>
        </section>

        <section className="h-0 bg-transparent" />
      </div>

      {isWeatherModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/45 px-4 pb-28 pt-10">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 p-2">
                <img src="/LOAM_WeatherSkip_Icon_Evergreen.svg" alt="Weather Day Skip" className={iconClass} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#666666]">Skip Today&apos;s Jobs?</h2>
                <p className="mt-1 text-sm text-[#666666]">
                  This will move all of today&apos;s scheduled jobs to tomorrow using rain-delay shift.
                </p>
              </div>
            </div>

            {weatherShiftError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-[#666666]">{weatherShiftError}</p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium text-[#666666]"
                onClick={() => setIsWeatherModalOpen(false)}
                disabled={isShiftingWeather}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#287b40] px-3 py-2.5 text-sm font-semibold text-[#666666] disabled:opacity-70"
                onClick={confirmWeatherSkip}
                disabled={isShiftingWeather}
              >
                {isShiftingWeather ? "Shifting..." : "Yes, Shift"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
