import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

type TimelineEvent = {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export async function listTimelineEvents(input: {
  entityType: string;
  entityId: string;
  includeRelated?: Array<{ entityType: string; entityId: string | null | undefined }>;
}) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();

  const pairs = [
    { entityType: input.entityType, entityId: input.entityId },
    ...(input.includeRelated ?? []).filter((item) => Boolean(item.entityId)) as Array<{
      entityType: string;
      entityId: string;
    }>,
  ];

  const orClauses = pairs
    .map(
      ({ entityType, entityId }) =>
        `and(entity_type.eq.${entityType},entity_id.eq.${entityId})`,
    )
    .join(",");

  const result = await supabase
    .from("events")
    .select("id, organization_id, entity_type, entity_id, event_type, metadata, created_at")
    .eq("organization_id", orgId)
    .or(orClauses)
    .order("created_at", { ascending: false })
    .limit(100);

  throwDbError(result.error, "Failed to load operational timeline");
  const raw = (result.data ?? []) as TimelineEvent[];

  // Compatibility safeguard: during app_events -> events mirroring, duplicated canonical rows can
  // appear with matching entity/event/metadata in the same second. Collapse them for UI timelines.
  const deduped: TimelineEvent[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    const secondBucket = new Date(row.created_at).toISOString().slice(0, 19);
    const signature = [
      row.entity_type,
      row.entity_id,
      row.event_type,
      secondBucket,
      stableStringify(row.metadata ?? null),
    ].join("|");
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(row);
  }

  return deduped;
}
