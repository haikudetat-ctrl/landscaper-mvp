"use client";

import type { DragEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/ui/cn";

import { moveLeadStageAction } from "./actions";

const LEAD_MIME_TYPE = "application/x-loam-lead";

type DragPayload = {
  leadId: string;
  fromStage: string;
};

function readPayload(event: DragEvent<HTMLElement>): DragPayload | null {
  const raw = event.dataTransfer.getData(LEAD_MIME_TYPE);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>;
    if (!parsed.leadId || !parsed.fromStage) return null;
    return {
      leadId: parsed.leadId,
      fromStage: parsed.fromStage,
    };
  } catch {
    return null;
  }
}

export function LeadDropColumn({
  stage,
  className,
  children,
}: {
  stage: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (event.dataTransfer.types.includes(LEAD_MIME_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setIsOver(true);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    const payload = readPayload(event);
    if (!payload) return;

    event.preventDefault();
    setIsOver(false);
    setError(null);

    if (payload.fromStage === stage) return;

    startTransition(async () => {
      try {
        await moveLeadStageAction(payload.leadId, stage);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Lead move failed.");
      }
    });
  }

  return (
    <section
      className={cn(
        className,
        "transition-colors",
        isOver ? "border-[#2b6840] bg-[#eef5ec] ring-2 ring-[#2b6840]/20" : null,
        isPending ? "opacity-75" : null,
      )}
      onDragLeave={() => setIsOver(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function LeadDragHandle({
  leadId,
  stage,
}: {
  leadId: string;
  stage: string;
}) {
  function handleDragStart(event: DragEvent<HTMLSpanElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      LEAD_MIME_TYPE,
      JSON.stringify({
        leadId,
        fromStage: stage,
      } satisfies DragPayload),
    );
    event.dataTransfer.setData("text/plain", leadId);
  }

  return (
    <span
      aria-label="Move lead"
      className="inline-flex min-h-8 cursor-grab select-none items-center rounded-md border border-[#c6d1c3] bg-[#f6f8f4] px-2 text-[11px] font-semibold text-zinc-600 active:cursor-grabbing"
      draggable
      onClick={(event) => event.preventDefault()}
      onDragStart={handleDragStart}
      role="button"
      tabIndex={0}
      title="Drag to another stage"
    >
      Move
    </span>
  );
}
