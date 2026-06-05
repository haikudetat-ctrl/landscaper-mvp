import { logEvent } from "@/lib/db/operational-events";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GenerationOutcome = "created" | "skipped_existing" | "not_recurring";

export type RecurringVisitGenerationResult = {
  idempotencyResult: GenerationOutcome;
  reason: string;
  completedVisitId: string;
  newVisitId: string | null;
  servicePlanId: string | null;
  interval: string | null;
  scheduledDate: string | null;
};

type CompletedVisitRow = {
  id: string;
  organization_id: string;
  property_id: string;
  service_plan_id: string | null;
  service_type_id: string;
  scheduled_date: string;
  scheduled_at: string | null;
  status: string;
  quoted_price: number;
  invoice_status: string | null;
  invoice_generated_at: string | null;
  recurrence_sequence?: number | null;
};

type ServicePlanRow = {
  id: string;
  organization_id: string;
  property_id: string;
  service_type_id: string;
  frequency_type: string;
  interval_count: number | null;
  quoted_price: number;
  status: string;
  notes: string | null;
  auto_generate_visits: boolean;
  end_date: string | null;
};

function toDateOnly(value: string) {
  const [year = "0", month = "1", day = "1"] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = toDateOnly(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

function addCalendarMonths(dateValue: string, months: number) {
  const source = toDateOnly(dateValue);
  const sourceDay = source.getUTCDate();
  const targetMonthStart = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const targetMonthLastDay = new Date(Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonthStart.setUTCDate(Math.min(sourceDay, targetMonthLastDay));
  return toDateString(targetMonthStart);
}

function scheduledAtForNextDate(previousScheduledAt: string | null, nextScheduledDate: string) {
  if (!previousScheduledAt?.includes("T")) {
    return `${nextScheduledDate}T09:00:00Z`;
  }

  return `${nextScheduledDate}T${previousScheduledAt.split("T")[1]}`;
}

function normalizeInterval(frequencyType: string) {
  return frequencyType === "custom-interval" ? "custom_interval" : frequencyType;
}

function calculateNextScheduledDate(visit: CompletedVisitRow, plan: ServicePlanRow) {
  const interval = normalizeInterval(plan.frequency_type);

  if (interval === "weekly") {
    return { interval, scheduledDate: addDays(visit.scheduled_date, 7), error: null };
  }

  if (interval === "biweekly") {
    return { interval, scheduledDate: addDays(visit.scheduled_date, 14), error: null };
  }

  if (interval === "monthly") {
    return { interval, scheduledDate: addCalendarMonths(visit.scheduled_date, 1), error: null };
  }

  if (interval === "custom_interval") {
    const days = plan.interval_count;
    if (!days || days < 1) {
      return { interval, scheduledDate: null, error: "custom_interval_missing_days" };
    }
    return { interval, scheduledDate: addDays(visit.scheduled_date, days), error: null };
  }

  if (interval === "one-time" || interval === "one_time") {
    return { interval, scheduledDate: null, error: "non_recurring_frequency" };
  }

  return { interval, scheduledDate: null, error: "unsupported_interval" };
}

async function logRecurringGeneration(input: {
  organizationId: string;
  actorUserId?: string | null;
  completedVisitId: string;
  result: RecurringVisitGenerationResult;
}) {
  await logEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityType: "service_visit",
    entityId: input.completedVisitId,
    eventType: "recurring_visit_generated",
    metadata: {
      completed_visit_id: input.completedVisitId,
      new_visit_id: input.result.newVisitId,
      service_plan_id: input.result.servicePlanId,
      interval: input.result.interval,
      scheduled_date: input.result.scheduledDate,
      idempotency_result: input.result.idempotencyResult,
      reason: input.result.reason,
    },
  });
}

async function finishWithEvent(input: {
  organizationId: string;
  actorUserId?: string | null;
  result: RecurringVisitGenerationResult;
}) {
  await logRecurringGeneration({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    completedVisitId: input.result.completedVisitId,
    result: input.result,
  });

  return input.result;
}

function isCompletedEnoughForGeneration(visit: CompletedVisitRow) {
  return visit.status === "completed" || Boolean(visit.invoice_generated_at) || visit.invoice_status === "generated";
}

export async function generateNextVisitFromCompletedVisit(input: {
  organizationId: string;
  completedVisitId: string;
  actorUserId?: string | null;
}): Promise<RecurringVisitGenerationResult> {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  if (orgId !== input.organizationId) {
    throw new Error("Organization mismatch for recurring visit generation.");
  }

  const visitResult = await supabase
    .from("service_visits")
    .select(
      "id, organization_id, property_id, service_plan_id, service_type_id, scheduled_date, scheduled_at, status, quoted_price, invoice_status, invoice_generated_at, recurrence_sequence",
    )
    .eq("id", input.completedVisitId)
    .eq("organization_id", input.organizationId)
    .single();

  throwDbError(visitResult.error, "Failed to load completed visit for recurring generation");
  const visit = visitResult.data as CompletedVisitRow | null;
  if (!visit) {
    throw new Error("Completed visit not found for recurring generation.");
  }

  const notRecurring = (reason: string, details?: Partial<RecurringVisitGenerationResult>) =>
    finishWithEvent({
      organizationId: visit.organization_id,
      actorUserId: input.actorUserId,
      result: {
        idempotencyResult: "not_recurring",
        reason,
        completedVisitId: visit.id,
        newVisitId: null,
        servicePlanId: visit.service_plan_id,
        interval: null,
        scheduledDate: null,
        ...details,
      },
    });

  if (!isCompletedEnoughForGeneration(visit)) {
    return notRecurring("visit_not_completed");
  }

  if (!visit.service_plan_id) {
    return notRecurring("no_service_plan");
  }

  const planResult = await supabase
    .from("service_plans")
    .select("id, organization_id, property_id, service_type_id, frequency_type, interval_count, quoted_price, status, notes, auto_generate_visits, end_date")
    .eq("id", visit.service_plan_id)
    .eq("organization_id", input.organizationId)
    .single();

  throwDbError(planResult.error, "Failed to load recurring service plan");
  const plan = planResult.data as ServicePlanRow | null;
  if (!plan) {
    return notRecurring("service_plan_not_found");
  }

  const { interval, scheduledDate, error } = calculateNextScheduledDate(visit, plan);

  if (plan.status !== "active") {
    return notRecurring("service_plan_inactive", { servicePlanId: plan.id, interval });
  }

  if (!plan.auto_generate_visits) {
    return notRecurring("recurrence_disabled", { servicePlanId: plan.id, interval });
  }

  if (error || !scheduledDate) {
    return notRecurring(error ?? "unsupported_interval", { servicePlanId: plan.id, interval });
  }

  if (plan.end_date && scheduledDate > plan.end_date) {
    return notRecurring("next_date_after_plan_end", { servicePlanId: plan.id, interval, scheduledDate });
  }

  const existingFromVisitResult = await supabase
    .from("service_visits")
    .select("id, scheduled_date")
    .eq("organization_id", visit.organization_id)
    .eq("generated_from_visit_id", visit.id)
    .eq("generation_reason", "recurring_completion")
    .not("status", "in", "(cancelled,canceled,skipped)")
    .limit(1)
    .maybeSingle();

  throwDbError(existingFromVisitResult.error, "Failed to check existing generated visit");
  const existingFromVisit = existingFromVisitResult.data as { id: string; scheduled_date: string } | null;
  if (existingFromVisit) {
    return finishWithEvent({
      organizationId: visit.organization_id,
      actorUserId: input.actorUserId,
      result: {
        idempotencyResult: "skipped_existing",
        reason: "generated_from_visit_exists",
        completedVisitId: visit.id,
        newVisitId: existingFromVisit.id,
        servicePlanId: plan.id,
        interval,
        scheduledDate: existingFromVisit.scheduled_date,
      },
    });
  }

  const existingDateResult = await supabase
    .from("service_visits")
    .select("id, scheduled_date")
    .eq("organization_id", visit.organization_id)
    .eq("service_plan_id", plan.id)
    .eq("property_id", visit.property_id)
    .eq("scheduled_date", scheduledDate)
    .not("status", "in", "(cancelled,canceled,skipped)")
    .limit(1)
    .maybeSingle();

  throwDbError(existingDateResult.error, "Failed to check duplicate future visit");
  const existingDateVisit = existingDateResult.data as { id: string; scheduled_date: string } | null;
  if (existingDateVisit) {
    return finishWithEvent({
      organizationId: visit.organization_id,
      actorUserId: input.actorUserId,
      result: {
        idempotencyResult: "skipped_existing",
        reason: "matching_plan_property_date_exists",
        completedVisitId: visit.id,
        newVisitId: existingDateVisit.id,
        servicePlanId: plan.id,
        interval,
        scheduledDate: existingDateVisit.scheduled_date,
      },
    });
  }

  const insertResult = await supabase
    .from("service_visits")
    .insert({
      organization_id: visit.organization_id,
      property_id: visit.property_id,
      service_plan_id: plan.id,
      service_type_id: plan.service_type_id ?? visit.service_type_id,
      scheduled_date: scheduledDate,
      scheduled_at: scheduledAtForNextDate(visit.scheduled_at, scheduledDate),
      status: "scheduled",
      quoted_price: plan.quoted_price ?? visit.quoted_price,
      operator_notes: plan.notes,
      generated_from_visit_id: visit.id,
      generation_reason: "recurring_completion",
      recurrence_sequence: (visit.recurrence_sequence ?? 1) + 1,
    })
    .select("id, scheduled_date")
    .single();

  if (insertResult.error?.code === "23505") {
    const conflictResult = await supabase
      .from("service_visits")
      .select("id, scheduled_date")
      .eq("organization_id", visit.organization_id)
      .eq("service_plan_id", plan.id)
      .eq("property_id", visit.property_id)
      .eq("scheduled_date", scheduledDate)
      .not("status", "in", "(cancelled,canceled,skipped)")
      .limit(1)
      .maybeSingle();

    throwDbError(conflictResult.error, "Failed to load conflicting recurring visit");
    const conflictingVisit = conflictResult.data as { id: string; scheduled_date: string } | null;
    return finishWithEvent({
      organizationId: visit.organization_id,
      actorUserId: input.actorUserId,
      result: {
        idempotencyResult: "skipped_existing",
        reason: "unique_constraint_conflict",
        completedVisitId: visit.id,
        newVisitId: conflictingVisit?.id ?? null,
        servicePlanId: plan.id,
        interval,
        scheduledDate,
      },
    });
  }

  throwDbError(insertResult.error, "Failed to create next recurring service visit");
  const inserted = insertResult.data as { id: string; scheduled_date: string } | null;
  if (!inserted) {
    throw new Error("Recurring visit insert returned no record.");
  }

  return finishWithEvent({
    organizationId: visit.organization_id,
    actorUserId: input.actorUserId,
    result: {
      idempotencyResult: "created",
      reason: "next_visit_created",
      completedVisitId: visit.id,
      newVisitId: inserted.id,
      servicePlanId: plan.id,
      interval,
      scheduledDate: inserted.scheduled_date,
    },
  });
}
