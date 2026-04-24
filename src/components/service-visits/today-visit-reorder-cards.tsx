"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/ui/status-pill";
import { formatAddress, formatDate } from "@/lib/utils/format";

type VisitRelationClient = {
  full_name: string | null;
  primary_phone: string | null;
} | null;

type VisitRelationProperty = {
  street_1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  clients: VisitRelationClient | VisitRelationClient[] | null;
} | null;

type VisitRelationServiceType = {
  label: string | null;
} | null;

export type TodayVisitCard = {
  id: string;
  scheduled_date: string;
  scheduled_position: number | null;
  status: string;
  is_missed_appointment?: boolean;
  properties: VisitRelationProperty | VisitRelationProperty[] | null;
  service_types: VisitRelationServiceType | VisitRelationServiceType[] | null;
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  if (!moved) return items;
  copy.splice(toIndex, 0, moved);
  return copy;
}

export function TodayVisitReorderCards({ visits }: { visits: TodayVisitCard[] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [items, setItems] = useState(visits);

  const hasChanges = useMemo(() => {
    if (items.length !== visits.length) return true;
    return items.some((item, index) => item.id !== visits[index]?.id);
  }, [items, visits]);

  function moveUp(index: number) {
    if (index <= 0) return;
    setItems((current) => moveItem(current, index, index - 1));
  }

  function moveDown(index: number) {
    if (index >= items.length - 1) return;
    setItems((current) => moveItem(current, index, index + 1));
  }

  function cancelEdit() {
    setItems(visits);
    setSaveError(null);
    setSaveMessage(null);
    setIsEditing(false);
  }

  async function saveOrder() {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/service-visits/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: items.map((visit, index) => ({
            visitId: visit.id,
            scheduledPosition: index + 1,
          })),
        }),
      });
      const payload = (await response.json()) as { updated?: number; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save visit order");
      }

      setSaveMessage(`Order saved for ${payload.updated ?? items.length} jobs.`);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save visit order");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2 md:hidden">
      <div className="rounded-2xl border border-emerald-200/80 bg-white/90 p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
            Today Job Order
          </p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveOrder}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Order"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setSaveMessage(null);
                setIsEditing(true);
              }}
              className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Reorder
            </button>
          )}
        </div>
        {isEditing ? (
          <p className="mt-1 text-xs text-zinc-600">
            Use the arrow buttons on each card to move jobs up or down.
          </p>
        ) : null}
      </div>

      {saveError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{saveError}</p>
      ) : null}
      {saveMessage ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{saveMessage}</p>
      ) : null}

      {items.map((visit, index) => {
        const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
        const client = property
          ? Array.isArray(property.clients)
            ? property.clients[0]
            : property.clients
          : null;
        const serviceType = Array.isArray(visit.service_types) ? visit.service_types[0] : visit.service_types;
        const isMissed = Boolean(visit.is_missed_appointment);

        const cardContent = (
          <>
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
          </>
        );

        return (
          <div
            key={visit.id}
            className={`rounded-md border p-3 shadow-sm ${
              isMissed ? "border-red-300 bg-red-50/70" : "border-zinc-200 bg-white"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                Position {index + 1}
              </p>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0 || isSaving}
                    className="h-7 w-7 rounded-full border border-emerald-200 bg-white text-xs font-bold text-zinc-700 disabled:opacity-40"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1 || isSaving}
                    className="h-7 w-7 rounded-full border border-emerald-200 bg-white text-xs font-bold text-zinc-700 disabled:opacity-40"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
              ) : null}
            </div>

            {isEditing ? (
              <div>{cardContent}</div>
            ) : (
              <Link href={`/service-visits/${visit.id}`} className="block">
                {cardContent}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
