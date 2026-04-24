"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentWeekBounds(referenceDate: Date): { weekStart: string; weekEnd: string } {
  const weekStartDate = new Date(referenceDate);
  const day = weekStartDate.getDay();
  const offset = (day + 6) % 7;
  weekStartDate.setDate(weekStartDate.getDate() - offset);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return {
    weekStart: toLocalIsoDate(weekStartDate),
    weekEnd: toLocalIsoDate(weekEndDate),
  };
}

type Preset = "today" | "thisWeek" | "custom";

export function ServiceVisitToolbar({
  currentFrom,
  currentTo,
}: {
  currentFrom: string;
  currentTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);
  const [customError, setCustomError] = useState<string | null>(null);

  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isShifting, setIsShifting] = useState(false);
  const [shiftMessage, setShiftMessage] = useState<string | null>(null);
  const [shiftError, setShiftError] = useState<string | null>(null);

  const today = useMemo(() => toLocalIsoDate(new Date()), []);
  const { weekStart, weekEnd } = useMemo(() => getCurrentWeekBounds(new Date()), []);

  const activePreset: Preset =
    currentFrom === today && currentTo === today
      ? "today"
      : currentFrom === weekStart && currentTo === weekEnd
        ? "thisWeek"
        : "custom";

  function pushRange(from: string, to: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("from", from);
    next.set("to", to);
    router.push(`${pathname}?${next.toString()}`);
  }

  function applyPreset(preset: Preset) {
    if (preset === "today") {
      setIsCustomOpen(false);
      pushRange(today, today);
      return;
    }

    if (preset === "thisWeek") {
      setIsCustomOpen(false);
      pushRange(weekStart, weekEnd);
      return;
    }

    setCustomError(null);
    setCustomFrom(currentFrom);
    setCustomTo(currentTo);
    setIsCustomOpen(true);
  }

  function submitCustomRange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomError(null);

    if (!customFrom || !customTo) {
      setCustomError("Both dates are required.");
      return;
    }

    if (customFrom > customTo) {
      setCustomError("From date must be on or before To date.");
      return;
    }

    setIsCustomOpen(false);
    pushRange(customFrom, customTo);
  }

  async function confirmWeatherShift() {
    setIsShifting(true);
    setShiftError(null);
    setShiftMessage(null);

    try {
      const response = await fetch("/api/service-visits/rain-delay-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDate: today,
          reason: "Weather day skip from service visits",
        }),
      });
      const payload = (await response.json()) as { shiftedCount?: number; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to shift today's jobs");
      }

      setShiftMessage(`Shifted ${payload.shiftedCount ?? 0} jobs to tomorrow.`);
      setIsWeatherModalOpen(false);
      router.refresh();
    } catch (error) {
      setShiftError(error instanceof Error ? error.message : "Failed to shift today's jobs");
    } finally {
      setIsShifting(false);
    }
  }

  function presetButtonClass(preset: Preset): string {
    const isActive = activePreset === preset;
    return isActive
      ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
      : "rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700";
  }

  return (
    <>
      <div className="space-y-2">
        <div className="rounded-2xl border border-emerald-200/80 bg-white/90 p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={presetButtonClass("today")} onClick={() => applyPreset("today")}>
              Today
            </button>
            <button type="button" className={presetButtonClass("thisWeek")} onClick={() => applyPreset("thisWeek")}>
              This Week
            </button>
            <button type="button" className={presetButtonClass("custom")} onClick={() => applyPreset("custom")}>
              Custom Range
            </button>
          </div>

          {isCustomOpen ? (
            <form onSubmit={submitCustomRange} className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold text-zinc-700">From</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold text-zinc-700">To</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-400"
                />
              </label>
              <button
                type="submit"
                className="h-[42px] rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm"
              >
                Apply
              </button>
              {customError ? <p className="text-xs font-medium text-red-700 md:col-span-3">{customError}</p> : null}
            </form>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setShiftError(null);
            setIsWeatherModalOpen(true);
          }}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
          disabled={isShifting}
        >
          {isShifting ? "Shifting..." : "Weather Day Skip (Shift Today's Jobs)"}
        </button>

        {shiftMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            {shiftMessage}
          </p>
        ) : null}
      </div>

      {isWeatherModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 px-4 pb-28 pt-10 md:items-center md:pb-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg">
            <h2 className="text-base font-semibold text-zinc-900">Shift Today&apos;s Jobs?</h2>
            <p className="mt-1 text-sm text-zinc-700">
              This will move all scheduled jobs for today to tomorrow with a rain-delay shift.
            </p>

            {shiftError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{shiftError}</p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsWeatherModalOpen(false)}
                className="rounded-full border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-700"
                disabled={isShifting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmWeatherShift}
                className="rounded-full bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white"
                disabled={isShifting}
              >
                {isShifting ? "Shifting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
