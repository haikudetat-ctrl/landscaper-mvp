import { requireOrgContext, throwDbError } from "@/lib/db/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

export type LogEventInput = {
  organizationId?: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  previousState?: Json | null;
  newState?: Json | null;
  metadata?: Json;
};

export async function logEvent(input: LogEventInput) {
  const supabase = createSupabaseServerClient();
  let organizationId = input.organizationId;
  let actorUserId = input.actorUserId ?? null;

  if (!organizationId || input.actorUserId === undefined) {
    const { orgId, userId } = await requireOrgContext();
    if (organizationId && organizationId !== orgId) {
      throw new Error("Organization mismatch while logging operational event.");
    }
    organizationId = organizationId ?? orgId;
    actorUserId = input.actorUserId ?? userId;
  }

  const result = await supabase
    .from("events")
    .insert({
      organization_id: organizationId,
      actor_user_id: actorUserId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      event_type: input.eventType,
      previous_state: input.previousState ?? null,
      new_state: input.newState ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  throwDbError(result.error, "Failed to log operational event");
  return result.data;
}
