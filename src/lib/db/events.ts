import type { PostgrestError } from "@supabase/supabase-js";

import { getCurrentUserMembership } from "@/lib/db/auth";
import { throwDbError } from "@/lib/db/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";
import type { APP_EVENT_TYPES } from "@/lib/utils/constants";

export type AppEventType = (typeof APP_EVENT_TYPES)[number];
export type AppEventEntityType = "service_visit" | "invoice" | "property" | "client" | "route";

export type AppEvent = {
  id: string;
  tenant_id: string | null;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  event_type: string;
  previous_state: Json | null;
  next_state: Json | null;
  payload: Json;
  metadata: Json;
  source: string;
  created_at: string;
};

type RpcClient = ReturnType<typeof createSupabaseServerClient> & {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: PostgrestError | null }>;
};

async function getEventContext() {
  const { user, membership } = await getCurrentUserMembership();

  return {
    actorId: user?.id ?? null,
    tenantId: membership?.organization_id ?? null,
  };
}

function asEvent(data: unknown): AppEvent {
  return data as AppEvent;
}

export async function recordAppEvent(input: {
  entityType: AppEventEntityType;
  entityId: string;
  eventType: AppEventType;
  previousState?: Json | null;
  nextState?: Json | null;
  payload?: Json;
  metadata?: Json;
  source?: string;
  tenantId?: string | null;
  actorId?: string | null;
}) {
  const context = await getEventContext();
  const supabase = createSupabaseServerClient() as RpcClient;

  const result = await supabase.rpc("record_app_event", {
    p_tenant_id: input.tenantId ?? context.tenantId,
    p_actor_id: input.actorId ?? context.actorId,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_event_type: input.eventType,
    p_previous_state: input.previousState ?? null,
    p_next_state: input.nextState ?? null,
    p_payload: input.payload ?? {},
    p_metadata: input.metadata ?? {},
    p_source: input.source ?? "app",
  });

  throwDbError(result.error, "Failed to record app event");
  return asEvent(result.data);
}

export async function transitionServiceVisitState(input: {
  visitId: string;
  eventType: Extract<
    AppEventType,
    | "visit_scheduled"
    | "visit_confirmed"
    | "visit_started"
    | "visit_completed"
    | "visit_skipped"
    | "visit_rescheduled"
    | "visit_paused"
    | "visit_needs_review"
    | "photo_uploaded"
  >;
  scheduledDate?: string | null;
  payload?: Json;
  metadata?: Json;
  source?: string;
}) {
  const context = await getEventContext();
  const supabase = createSupabaseServerClient() as RpcClient;

  const result = await supabase.rpc("transition_service_visit_state", {
    p_tenant_id: context.tenantId,
    p_actor_id: context.actorId,
    p_service_visit_id: input.visitId,
    p_event_type: input.eventType,
    p_scheduled_date: input.scheduledDate ?? null,
    p_payload: input.payload ?? {},
    p_metadata: input.metadata ?? {},
    p_source: input.source ?? "app",
  });

  throwDbError(result.error, "Failed to transition service visit state");
  return result.data as { service_visit: Json; event: AppEvent }[] | null;
}

export async function getEntityEvents(entityType: AppEventEntityType, entityId: string) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("app_events" as never)
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });

  throwDbError(result.error, "Failed to load app events");
  return (result.data ?? []) as AppEvent[];
}

export async function getVisitTimeline(visitId: string) {
  return getEntityEvents("service_visit", visitId);
}
