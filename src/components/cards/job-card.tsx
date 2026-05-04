import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { normalizeOpsStatus, StatusPill, type OpsStatus } from "@/components/status/status-pill";
import { cn } from "@/lib/ui/cn";
import { formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

export interface JobCardData {
  clientName: string;
  propertyAddress: string;
  serviceType: string;
  scheduledDate?: string | null;
  scheduledWindow?: string | null;
  status: OpsStatus;
  price?: number | null;
  notes?: string | null;
  photos?: number | null;
  assignedCrew?: string | null;
}

export interface JobCardProps {
  job: JobCardData;
  variant: "compact" | "expanded" | "active" | "completed" | "problem";
  primaryAction?: { label: string; onClick?: () => void };
  secondaryAction?: { label: string; onClick?: () => void };
}

const variantMap: Record<JobCardProps["variant"], string> = {
  compact: "",
  expanded: "",
  active: "border-[#287b40] bg-emerald-50 ring-2 ring-emerald-300/60",
  completed: "bg-emerald-50/70",
  problem: "border-amber-400 bg-amber-50",
};

export function JobCard({ job, variant, primaryAction, secondaryAction }: JobCardProps) {
  return (
    <Card className={cn("rounded-2xl border border-emerald-200 bg-white p-4", variantMap[variant])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">{job.clientName}</p>
          <p className="mt-0.5 text-xs font-medium text-zinc-800">{job.propertyAddress}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-700">{job.serviceType}</p>
        </div>
        <StatusPill status={job.status} size="sm" />
      </div>

      <div className="mt-3 grid gap-2 text-xs font-medium text-zinc-800 sm:grid-cols-2">
        <p>{job.scheduledDate ? formatDate(job.scheduledDate) : "Date TBD"}</p>
        <p>{job.scheduledWindow ?? "Window TBD"}</p>
        {job.price != null ? <p className="font-semibold text-zinc-950">{formatCurrencyFromCents(job.price)}</p> : <p>Price pending</p>}
        {job.assignedCrew ? <p>Crew: {job.assignedCrew}</p> : <p>No crew assigned</p>}
      </div>

      {variant !== "compact" && job.notes ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-zinc-900">{job.notes}</p> : null}
      {variant !== "compact" ? <p className="mt-2 text-xs font-medium text-zinc-700">Photos: {job.photos ?? 0}</p> : null}

      {primaryAction || secondaryAction ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {primaryAction ? (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button data-variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function mapVisitToJobCardData(input: {
  client_name?: string | null;
  street_1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  service_type_label?: string | null;
  scheduled_date?: string | null;
  visit_status?: string | null;
  quoted_price?: number | null;
  operator_notes?: string | null;
  photo_count?: number | null;
  gate_notes?: string | null;
}) {
  const parts = [input.street_1, [input.city, input.state, input.postal_code].filter(Boolean).join(" ")].filter(Boolean);
  return {
    clientName: input.client_name ?? "Client",
    propertyAddress: parts.join(" • ") || "Address missing",
    serviceType: input.service_type_label ?? "Service",
    scheduledDate: input.scheduled_date,
    status: normalizeOpsStatus(input.visit_status),
    price: input.quoted_price,
    notes: input.operator_notes ?? input.gate_notes,
    photos: input.photo_count ?? 0,
  } satisfies JobCardData;
}
