"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { DashboardData } from "@/lib/db/dashboard";
import { formatAddress, formatCurrencyFromCents } from "@/lib/utils/format";

type SearchSuggestion = {
  id: string;
  href: string;
  title: string;
  path: string;
  subtitle?: string;
};

function LawnMowerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#287b40]" aria-hidden="true">
      <circle cx="6" cy="18" r="3" fill="currentColor" />
      <circle cx="17" cy="18" r="4" fill="currentColor" />
      <path d="M5 13h10l2-5h-6l-1 2H7z" fill="currentColor" />
      <path d="M10 8l2-4h2l-2 4z" fill="currentColor" />
    </svg>
  );
}

function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#287b40]" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 10h4v11H2zm6 11h8.7a2.2 2.2 0 0 0 2.1-1.6l2-7a2.3 2.3 0 0 0-2.2-2.9h-5l.7-3.8V5a2 2 0 0 0-2-2l-4.3 6.4z"
      />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#287b40]" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 2h12v20l-2-1.4L14 22l-2-1.4L10 22l-2-1.4L6 22zm2 4v2h8V6zm0 4v2h8v-2zm0 4v2h6v-2z"
      />
    </svg>
  );
}

function WeatherSkipIcon({ className = "h-6 w-6 text-white" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 18a4 4 0 1 1 0-8a5 5 0 0 1 9.7-1A3.5 3.5 0 1 1 18.5 18zm-2.2 4l2.4-3.6h1.6L6.4 22zm5 0l2.4-3.6h1.6L11.4 22zm5 0l2.4-3.6h1.6L16.4 22z"
      />
    </svg>
  );
}

export function MobileHomeDashboard({ data }: { data: DashboardData["mobile"] }) {
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
    if (!data.nextJob) return "/service-visits";
    if (data.nextJob.propertyId) return `/properties/${data.nextJob.propertyId}`;
    return `/service-visits/${data.nextJob.visitId}`;
  }, [data.nextJob]);

  const nextJobMapUrl = useMemo(() => {
    if (!data.nextJob) return "#";
    const queryValue = [data.nextJob.street_1, data.nextJob.city, data.nextJob.state, data.nextJob.postal_code]
      .filter(Boolean)
      .join(" ");
    return `https://maps.google.com/?q=${encodeURIComponent(queryValue)}`;
  }, [data.nextJob]);

  const todayFilter = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);

  const fixedCardClass = "h-[clamp(82px,11.5vh,102px)] rounded-2xl p-2.5 shadow-sm";

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
      <div className="grid h-[calc(100dvh-9.5rem)] grid-rows-[minmax(0,1fr)_minmax(0,4fr)_minmax(0,2fr)] overflow-hidden bg-gradient-to-br from-[#6ab967] to-[#287b40]">
        <section className="relative px-4 pt-[5px] pb-[22px]">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6ab967]"
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
              className="w-full rounded-xl border border-white/70 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 outline-none focus:border-[#6ab967]"
            />
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6ab967]"
              aria-hidden="true"
            >
              <path fill="currentColor" d="M7 5h10v2H7zm0 6h10v2H7zm0 6h7v2H7z" />
            </svg>
          </div>

          {query.trim().length >= 2 ? (
            <div className="absolute left-4 right-4 top-[calc(100%-16px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
              {suggestions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-500">No matches found</div>
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
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#287b40]">
                      {suggestion.path}
                    </div>
                    <div className="text-sm font-medium text-zinc-900">{suggestion.title}</div>
                    {suggestion.subtitle ? (
                      <div className="text-xs text-zinc-600">{suggestion.subtitle}</div>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden bg-[#fafbfb] px-4 pt-3 pb-1">
          <div className="grid h-full grid-cols-2 gap-x-3">
            <div className="col-span-2 text-zinc-900">
              <p className="text-xs font-medium">Expected Monthly Revenue</p>
              <p className="text-lg font-bold leading-tight">{formatCurrencyFromCents(data.expectedMonthlyRevenue)}</p>
              <p className="mt-1 text-xs font-medium">Collected Money</p>
              <p className="text-base font-semibold leading-tight">{formatCurrencyFromCents(data.collectedMoneyThisMonth)}</p>
              <div className="h-1.5" />
              <p className="text-xs font-medium">
                Monthly Jobs {data.monthlyCompletedJobs}/{data.monthlyTotalJobs}
              </p>
              <div className="h-1.5" />
              <p className="text-[11px] text-zinc-600">{data.todayDateLabel}</p>
            </div>

            <div className="flex flex-col gap-[5px] pt-1">
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
                className={`${fixedCardClass} bg-white`}
              >
                <div className="flex h-full flex-col">
                  <div className="flex flex-[2] gap-2">
                    <div className="mt-0.5 shrink-0">
                      <LawnMowerIcon />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Next Job</p>
                      <a
                        href={nextJobMapUrl}
                        onClick={(event) => event.stopPropagation()}
                        className="text-[13px] font-semibold leading-4 text-zinc-900 underline"
                      >
                        {formatAddress(data.nextJob ?? {})}
                      </a>
                    </div>
                  </div>
                  <div className="mt-1 border-t border-zinc-200 pt-1 text-[12px] font-medium text-zinc-700">
                    Job Value: {formatCurrencyFromCents(data.nextJob?.quotedPrice ?? 0)}
                  </div>
                </div>
              </div>

              <Link href="/invoices?status=overdue" className={`${fixedCardClass} bg-white`}>
                <div className="flex h-full gap-2">
                  <div className="mt-0.5 shrink-0">
                    <InvoiceIcon />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Invoices</p>
                    <p className="text-[13px] font-semibold leading-4 text-zinc-900">Unpaid: {data.unpaidInvoiceCount}</p>
                    <p className="text-[13px] font-semibold leading-4 text-zinc-900">Overdue: {data.overdueInvoiceCount}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">
                      Remaining {formatCurrencyFromCents(data.unpaidAmount)}
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex flex-col gap-[5px] pt-1">
              <Link
                href={`/service-visits?from=${todayFilter}&to=${todayFilter}`}
                className={`${fixedCardClass} block bg-white`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    <ThumbsUpIcon />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Today&apos;s Jobs</p>
                    <p className="text-[13px] font-semibold leading-4 text-zinc-900">
                      {data.todayCompletedJobs}/{data.todayTotalJobs}
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-4 text-zinc-700">
                      Expected: {formatCurrencyFromCents(data.todayExpectedRevenue)}
                    </p>
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
                className={`${fixedCardClass} flex items-center bg-[#287b40] text-[13px] font-semibold text-white disabled:opacity-70`}
              >
                <div className="flex items-center gap-2">
                  <WeatherSkipIcon />
                  <span>{isShiftingWeather ? "Shifting..." : "Weather Day Skip Button"}</span>
                </div>
              </button>

              {weatherShiftMessage ? (
                <p className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-sm rounded-xl bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 shadow">
                  {weatherShiftMessage}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-[#6ab967] to-[#287b40]">
          <div className="h-[10px] bg-[#fafbfb]" />
        </section>
      </div>

      {isWeatherModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/45 px-4 pb-28 pt-10">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
                <WeatherSkipIcon className="h-7 w-7 text-amber-700" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Skip Today&apos;s Jobs?</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  This will move all of today&apos;s scheduled jobs to tomorrow using rain-delay shift.
                </p>
              </div>
            </div>

            {weatherShiftError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{weatherShiftError}</p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700"
                onClick={() => setIsWeatherModalOpen(false)}
                disabled={isShiftingWeather}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#287b40] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
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
