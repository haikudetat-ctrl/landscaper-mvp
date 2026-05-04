import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

export interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down" | "neutral";
  helperText?: string;
  icon?: ReactNode;
}

const deltaTone: Record<NonNullable<MetricCardProps["deltaDirection"]>, string> = {
  up: "text-emerald-800",
  down: "text-red-800",
  neutral: "text-zinc-700",
};

export function MetricCard({ label, value, delta, deltaDirection = "neutral", helperText, icon }: MetricCardProps) {
  return (
    <Card className="rounded-2xl border border-emerald-200/90 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700">{label}</p>
        {icon ? <div className="text-[#287b40]">{icon}</div> : null}
      </div>
      <p className="mt-2 text-3xl font-bold leading-none text-zinc-950">{value}</p>
      {delta ? <p className={cn("mt-2 text-sm font-semibold", deltaTone[deltaDirection])}>{delta}</p> : null}
      {helperText ? <p className="mt-1 text-xs font-medium text-zinc-700">{helperText}</p> : null}
    </Card>
  );
}
