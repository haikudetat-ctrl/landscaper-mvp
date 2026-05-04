import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

export type OpsStatus = "scheduled" | "completed" | "skipped" | "overdue" | "paused" | "needs_review";
export type StatusPillSize = "sm" | "md";

const statusToneMap: Record<OpsStatus, string> = {
  scheduled: "border-blue-300 bg-blue-100 text-blue-900",
  completed: "border-emerald-300 bg-emerald-100 text-emerald-900",
  skipped: "border-amber-300 bg-amber-100 text-amber-950",
  overdue: "border-red-300 bg-red-100 text-red-900",
  paused: "border-zinc-300 bg-zinc-100 text-zinc-800",
  needs_review: "border-orange-300 bg-orange-100 text-orange-950",
};

const sizeMap: Record<StatusPillSize, string> = {
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
};

export function statusLabel(status: OpsStatus) {
  return status.replaceAll("_", " ");
}

export function StatusPill({ status, label, size = "md", className }: { status: OpsStatus; label?: string; size?: StatusPillSize; className?: string }) {
  return (
    <Badge className={cn("rounded-full font-medium capitalize", sizeMap[size], statusToneMap[status], className)}>
      {label ?? statusLabel(status)}
    </Badge>
  );
}

export function normalizeOpsStatus(value: string | null | undefined): OpsStatus {
  if (value === "completed") return "completed";
  if (value === "skipped") return "skipped";
  if (value === "overdue") return "overdue";
  if (value === "paused") return "paused";
  if (value === "needs_review") return "needs_review";
  return "scheduled";
}
