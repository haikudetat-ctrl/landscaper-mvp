import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

export type OpsStatus = string;
export type StatusPillSize = "sm" | "md";

const statusToneMap: Record<string, string> = {
  scheduled: "border-blue-300 bg-blue-100 text-blue-900",
  completed: "border-emerald-300 bg-emerald-100 text-emerald-900",
  paid: "border-emerald-300 bg-emerald-100 text-emerald-800",
  active: "border-emerald-300 bg-emerald-100 text-emerald-800",
  skipped: "border-amber-300 bg-amber-100 text-amber-950",
  overdue: "border-red-300 bg-red-100 text-red-900",
  failed: "border-red-300 bg-red-100 text-red-800",
  paused: "border-zinc-300 bg-zinc-100 text-zinc-800",
  inactive: "border-zinc-300 bg-zinc-200 text-zinc-700",
  needs_review: "border-orange-300 bg-orange-100 text-orange-950",
  sent: "border-sky-100 bg-sky-100 text-sky-800",
};

const sizeMap: Record<StatusPillSize, string> = {
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
};

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function StatusPill({
  status,
  label,
  size = "md",
  className,
}: {
  status: string | null | undefined;
  label?: string;
  size?: StatusPillSize;
  className?: string;
}) {
  if (!status) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
        unknown
      </span>
    );
  }

  const tone = statusToneMap[status] ?? "bg-emerald-50 text-zinc-800";

  return (
    <Badge className={cn("rounded-full font-medium capitalize", sizeMap[size], tone, className)}>
      {label ?? statusLabel(status)}
    </Badge>
  );
}

export function normalizeOpsStatus(value: string | null | undefined): string {
  if (value === "completed") return "completed";
  if (value === "skipped") return "skipped";
  if (value === "overdue") return "overdue";
  if (value === "paused") return "paused";
  if (value === "needs_review") return "needs_review";
  if (value === "active") return "active";
  if (value === "paid") return "paid";
  if (value === "sent") return "sent";
  if (value === "failed") return "failed";
  if (value === "inactive") return "inactive";
  return "scheduled";
}
