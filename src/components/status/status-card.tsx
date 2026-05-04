import { Card } from "@/components/ui/card";

import { StatusPill, type OpsStatus, type StatusPillSize } from "./status-pill";

export function StatusCard({ status, label, size = "md", helperText }: { status: OpsStatus; label?: string; size?: StatusPillSize; helperText?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={status} label={label} size={size} />
        {helperText ? <p className="text-xs font-medium text-zinc-700">{helperText}</p> : null}
      </div>
    </Card>
  );
}
