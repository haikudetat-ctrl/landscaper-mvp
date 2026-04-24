"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

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
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
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

  const fixedCardClass = "h-[clamp(112px,16vh,148px)] rounded-2xl border-[0.5px] border-[#b0dcc1] p-2.5 shadow-sm";
  const topPanelClass = "h-[clamp(112px,16vh,148px)]";
  const cardCyanClass = "bg-[#fafbfb]";
  const expectedRevenue = Math.max(data.expectedMonthlyRevenue, 0);
  const collectedRevenue = Math.max(data.collectedMoneyThisMonth, 0);
  const hasRevenueTarget = expectedRevenue > 0;
  const revenueGap = hasRevenueTarget ? Math.max(expectedRevenue - collectedRevenue, 0) : 0;
  const revenueAboveTarget = hasRevenueTarget ? Math.max(collectedRevenue - expectedRevenue, 0) : collectedRevenue;
  const monthProgressRatio = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (daysInMonth <= 0) return 0;
    return Math.min(now.getDate() / daysInMonth, 1);
  }, []);
  const expectedRevenueToDate = hasRevenueTarget ? expectedRevenue * monthProgressRatio : 0;
  const revenueProgress = hasRevenueTarget
    ? Math.round((collectedRevenue / expectedRevenue) * 100)
    : collectedRevenue > 0
      ? 100
      : 0;
  const monthlyProgress = data.monthlyTotalJobs > 0 ? Math.round((data.monthlyCompletedJobs / data.monthlyTotalJobs) * 100) : 0;
  const revenueChartData = hasRevenueTarget
    ? [
        { label: "Start", expected: 0, collected: 0 },
        { label: "Today", expected: expectedRevenueToDate, collected: collectedRevenue },
        { label: "End", expected: expectedRevenue, collected: collectedRevenue },
      ]
    : [
        { label: "Start", expected: 0, collected: 0 },
        { label: "Today", expected: 0, collected: collectedRevenue },
        { label: "End", expected: 0, collected: collectedRevenue },
      ];
  const revenueChartMax = Math.max(
    ...revenueChartData.flatMap((row) => [row.expected ?? 0, row.collected ?? 0]),
    1
  );

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
    <div className="-mx-4 -mt-[15px] -mb-24 md:hidden">
      <div className="grid h-[calc(100dvh-9.5rem)] grid-rows-[minmax(0,1fr)_minmax(0,5fr)_minmax(0,1fr)] overflow-hidden bg-gradient-to-br from-[#6ab967] to-[#287b40]">
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
              className="w-full rounded-xl border border-white/70 bg-white py-2.5 pl-10 pr-10 text-sm text-[#666666] outline-none focus:border-[#6ab967]"
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

        <section className="overflow-hidden bg-white px-[18px] pt-[14px] pb-[6px]">
          <div className="grid h-full grid-cols-2 gap-2.5">
            <div className={`${topPanelClass} flex h-full flex-col justify-between px-0.5`}>
                <div className="space-y-1">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#666666]">
                      Expected Monthly Revenue
                    </p>
                    <p className="text-[18px] font-bold leading-none text-[#666666]">
                      {formatCurrencyFromCents(data.expectedMonthlyRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#666666]">Collected Money</p>
                    <p className="text-[18px] font-semibold leading-none text-[#287b40]">
                      {formatCurrencyFromCents(data.collectedMoneyThisMonth)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 border-t border-[#d3e7da] pt-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#666666]">
                    <span>Monthly Jobs {data.monthlyCompletedJobs}/{data.monthlyTotalJobs}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-[#666666]">
                      {monthlyProgress}%
                    </span>
                  </div>
                  <p className="text-[10px] text-[#666666]">{data.todayDateLabel}</p>
                </div>
              </div>

            <button
              type="button"
              onClick={() => setIsRevenueModalOpen(true)}
              className={`${topPanelClass} flex h-full flex-col px-0.5 text-left`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#666666]">Revenue Gap</p>
                <span className="text-[10px] font-semibold text-[#666666]">Expand</span>
              </div>
              <div className="relative mt-0.5 h-[64px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 2, right: 2, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expectedRevenueArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d3e7da" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#d3e7da" stopOpacity={0.25} />
                      </linearGradient>
                      <linearGradient id="collectedRevenueArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2f8a46" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#2f8a46" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#666666" }}
                      interval={0}
                      height={14}
                    />
                    <YAxis hide domain={[0, revenueChartMax * 1.08]} />
                    <Area
                      type="monotone"
                      dataKey="expected"
                      stroke="#a5ccb3"
                      strokeWidth={1.5}
                      fill="url(#expectedRevenueArea)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      stroke="#287b40"
                      strokeWidth={1.7}
                      fill="url(#collectedRevenueArea)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end pr-1">
                  <span className="rounded-full bg-white/85 px-1.5 py-0.5 text-[10px] font-bold text-[#666666]">
                    {revenueProgress}%
                  </span>
                </div>
              </div>
              <div className="mt-auto grid grid-cols-1 gap-0.5 text-[10px] text-[#666666]">
                <p className="font-semibold">Target: {formatCurrencyFromCents(data.expectedMonthlyRevenue)}</p>
                {hasRevenueTarget ? (
                  revenueGap > 0 ? (
                    <p className="text-[#666666]">Gap: {formatCurrencyFromCents(revenueGap)}</p>
                  ) : (
                    <p className="text-[#666666]">Ahead: {formatCurrencyFromCents(revenueAboveTarget)}</p>
                  )
                ) : (
                  <p className="text-[#666666]">Set a revenue target to track monthly gap.</p>
                )}
              </div>
            </button>

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
                  <div className="mt-0.5 shrink-0">
                    <LawnMowerIcon />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">Next Job</p>
                    <a
                      href={nextJobMapUrl}
                      onClick={(event) => event.stopPropagation()}
                      className="text-[13px] font-semibold leading-4 text-[#666666] underline"
                    >
                      {formatAddress(data.nextJob ?? {})}
                    </a>
                  </div>
                </div>
                <div className="mt-1 border-t border-zinc-200 pt-1 text-[12px] font-medium text-[#666666]">
                  Job Value: {formatCurrencyFromCents(data.nextJob?.quotedPrice ?? 0)}
                </div>
              </div>
            </div>

            <Link
              href={`/service-visits?from=${todayFilter}&to=${todayFilter}&view=today`}
              className={`${fixedCardClass} block ${data.overdueVisitCount > 0 ? "border border-[#cc9933] bg-[#ffffcc]" : cardCyanClass}`}
            >
              <div className="flex h-full flex-col">
                <div className="flex flex-[2] items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    <ThumbsUpIcon />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">Today&apos;s Jobs</p>
                    <p className="text-[13px] font-semibold leading-4 text-[#666666]">
                      {data.todayCompletedJobs}/{data.todayTotalJobs}
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-4 text-[#666666]">
                      Expected: {formatCurrencyFromCents(data.todayExpectedRevenue)}
                    </p>
                  </div>
                </div>
                <div className="mt-1 border-t border-zinc-200 pt-1 text-[12px] font-medium">
                  {data.overdueVisitCount > 0 ? (
                    <span className="text-[#cc9933]">Missed: {data.overdueVisitCount}</span>
                  ) : (
                    <span className="text-[#666666]">No missed appointments</span>
                  )}
                </div>
              </div>
            </Link>

            <Link href="/invoices?status=overdue" className={`${fixedCardClass} ${cardCyanClass}`}>
              <div className="flex h-full flex-col">
                <div className="flex flex-[2] gap-2">
                  <div className="mt-0.5 shrink-0">
                    <InvoiceIcon />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">Invoices</p>
                    <p className="text-[13px] font-semibold leading-4 text-[#666666]">Unpaid: {data.unpaidInvoiceCount}</p>
                    <p className="text-[13px] font-semibold leading-4 text-[#666666]">Overdue: {data.overdueInvoiceCount}</p>
                  </div>
                </div>
                <div className="mt-1 border-t border-zinc-200 pt-1 text-[12px] font-medium text-[#666666]">
                  Remaining {formatCurrencyFromCents(data.unpaidAmount)}
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
              className={`${fixedCardClass} flex items-center ${cardCyanClass} text-[13px] font-semibold text-[#666666] disabled:opacity-70`}
            >
              <div className="flex items-center gap-2">
                <WeatherSkipIcon className="h-6 w-6 text-[#287b40]" />
                <span>{isShiftingWeather ? "Shifting..." : "Weather Day Skip Button"}</span>
              </div>
            </button>

            {weatherShiftMessage ? (
              <p className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-sm rounded-xl bg-emerald-50 px-2 py-1 text-[11px] font-medium text-[#666666] shadow">
                {weatherShiftMessage}
              </p>
            ) : null}
          </div>
        </section>

        <section
          className="bg-gradient-to-br from-[#6ab967] to-[#287b40]"
          style={{
            boxShadow:
              "inset 0 10px 10px -10px rgba(0, 0, 0, 0.25), inset 0 -10px 10px -10px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="h-[10px] bg-[#fafbfb]" />
        </section>
      </div>

      {isRevenueModalOpen ? (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="absolute inset-0 bg-[#0f1f17]/80 backdrop-blur-sm" />
          <div className="relative flex h-full flex-col bg-gradient-to-br from-[#f3faf5] via-[#eef7f1] to-[#e3f1e8] px-4 pb-6 pt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#666666]">Monthly Revenue</p>
                <h2 className="text-2xl font-bold text-[#666666]">Revenue Gap</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsRevenueModalOpen(false)}
                className="rounded-full border border-[#b0dcc1] bg-white px-4 py-2 text-sm font-semibold text-[#666666] shadow-sm"
              >
                Close
              </button>
            </div>

            <div className="rounded-3xl border border-[#b0dcc1] bg-white/85 p-4 shadow-lg">
              <div className="h-[44dvh] min-h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 14, right: 10, left: -20, bottom: 8 }}>
                    <defs>
                      <linearGradient id="expectedRevenueAreaExpanded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d3e7da" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#d3e7da" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="collectedRevenueAreaExpanded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2f8a46" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#2f8a46" stopOpacity={0.18} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#666666" }}
                      interval={0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#666666" }}
                      tickFormatter={(value: number) => `$${Number(value).toFixed(0)}`}
                      domain={[0, revenueChartMax * 1.08]}
                      width={58}
                    />
                    <Area
                      type="monotone"
                      dataKey="expected"
                      stroke="#a5ccb3"
                      strokeWidth={2}
                      fill="url(#expectedRevenueAreaExpanded)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      stroke="#287b40"
                      strokeWidth={2.4}
                      fill="url(#collectedRevenueAreaExpanded)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-[#b0dcc1] bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666666]">Expected</p>
                  <p className="text-base font-semibold text-[#666666]">{formatCurrencyFromCents(data.expectedMonthlyRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-[#b0dcc1] bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666666]">Collected</p>
                  <p className="text-base font-semibold text-[#287b40]">{formatCurrencyFromCents(data.collectedMoneyThisMonth)}</p>
                </div>
                <div className="rounded-2xl border border-[#b0dcc1] bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666666]">Progress</p>
                  <p className="text-base font-semibold text-[#666666]">{revenueProgress}%</p>
                </div>
                <div className="rounded-2xl border border-[#b0dcc1] bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666666]">
                    {revenueGap > 0 ? "Gap" : "Ahead"}
                  </p>
                  <p className="text-base font-semibold text-[#666666]">
                    {formatCurrencyFromCents(revenueGap > 0 ? revenueGap : revenueAboveTarget)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isWeatherModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/45 px-4 pb-28 pt-10">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
                <WeatherSkipIcon className="h-7 w-7 text-amber-700" />
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
