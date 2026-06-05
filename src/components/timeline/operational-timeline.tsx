import { formatDateTime } from "@/lib/utils/format";

type TimelineItem = {
  id: string;
  entity_type: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function summarizeMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return "-";
  const keys = Object.keys(metadata).slice(0, 3);
  if (keys.length === 0) return "-";
  return keys
    .map((key) => `${key}: ${String(metadata[key])}`)
    .join(" • ");
}

export function OperationalTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-600">No operational events yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">{item.event_type.replaceAll("_", " ")}</p>
            <p className="text-xs text-zinc-500">{formatDateTime(item.created_at)}</p>
          </div>
          <p className="mt-1 text-xs text-zinc-600">{item.entity_type}</p>
          <p className="mt-1 text-xs text-zinc-500">{summarizeMetadata(item.metadata)}</p>
        </li>
      ))}
    </ol>
  );
}
