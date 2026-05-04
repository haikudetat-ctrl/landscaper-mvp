import { getCurrentUserMembership } from "@/lib/db/auth";
import { throwDbError } from "@/lib/db/shared";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";
import type { PostgrestError } from "@supabase/supabase-js";

export type RunPhase = "morning" | "confirm" | "ready" | "running" | "summary" | "collections";

export type DailyRunStateRow = {
  id: string;
  organization_id: string;
  user_id: string;
  run_date: string;
  phase: RunPhase;
  active_visit_id: string | null;
  confirmed_today: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type RpcClient = Awaited<ReturnType<typeof createSupabaseAuthServerClient>> & {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: PostgrestError | null }>;
};

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function getTodayRunState() {
  const { user, membership } = await getCurrentUserMembership();
  if (!user || !membership?.organization_id) return null;

  const supabase = (await createSupabaseAuthServerClient()) as RpcClient;
  const result = await supabase.rpc("get_daily_run_state", {
    p_organization_id: membership.organization_id,
    p_user_id: user.id,
    p_run_date: localDate(),
  });

  throwDbError(result.error, "Failed to load saved run state");
  return (result.data ?? null) as DailyRunStateRow | null;
}

export async function saveTodayRunState(input: {
  phase: RunPhase;
  activeVisitId?: string | null;
  confirmedToday?: boolean;
  metadata?: Json;
}) {
  const { user, membership } = await getCurrentUserMembership();
  if (!user || !membership?.organization_id) {
    throw new Error("You must be signed in with an organization membership.");
  }

  const supabase = (await createSupabaseAuthServerClient()) as RpcClient;
  const result = await supabase.rpc("upsert_daily_run_state", {
    p_organization_id: membership.organization_id,
    p_user_id: user.id,
    p_run_date: localDate(),
    p_phase: input.phase,
    p_active_visit_id: input.activeVisitId ?? null,
    p_confirmed_today: input.confirmedToday ?? false,
    p_metadata: input.metadata ?? {},
  });

  throwDbError(result.error, "Failed to save run state");
  return result.data as DailyRunStateRow;
}
