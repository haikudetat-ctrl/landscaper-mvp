import { Card } from "@/components/ui/card";
import { StatusPill, type OpsStatus } from "@/components/status/status-pill";

export interface PropertyCardData {
  address: string;
  clientName: string;
  serviceFrequency?: string | null;
  accessNotes?: string | null;
  propertyNotes?: string | null;
  lastPhoto?: string | null;
  status: OpsStatus;
}

export function PropertyCard({ property, variant = "compact" }: { property: PropertyCardData; variant?: "compact" | "expanded" }) {
  return (
    <Card className="rounded-2xl border border-emerald-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold leading-snug text-zinc-950">{property.address}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-800">{property.clientName}</p>
        </div>
        <StatusPill status={property.status} size="sm" />
      </div>

      {property.accessNotes ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">Access: {property.accessNotes}</p> : null}
      {variant === "expanded" && property.propertyNotes ? <p className="mt-3 text-sm font-medium text-zinc-800">{property.propertyNotes}</p> : null}
      {variant === "expanded" ? (
        <div className="mt-3 min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-zinc-800">
          {property.lastPhoto ? "Last photo available" : "No photo yet"}
        </div>
      ) : null}
    </Card>
  );
}
