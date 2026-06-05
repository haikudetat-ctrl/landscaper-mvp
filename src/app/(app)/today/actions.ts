"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import {
  generateInvoiceDraftFromCompletedVisit,
  markPaymentManuallyReceived,
} from "@/lib/db/invoices";
import { uploadVisitPhoto } from "@/lib/db/photos";
import { logEvent } from "@/lib/db/operational-events";
import {
  generateNextVisitFromCompletedVisit,
  type RecurringVisitGenerationResult,
} from "@/lib/db/recurring-visits";
import { throwDbError } from "@/lib/db/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Updates } from "@/lib/types/database";
import {
  buildForwardTransitionPlan,
  buildRevertPlan,
  deriveCanonicalState,
  getRevertTarget,
  type CanonicalVisitState,
} from "@/lib/workflows/today-visit-workflow";

type ServiceVisitUpdate = Updates<"service_visits">;
type ServiceVisitTimestampColumn =
  | "route_started_at"
  | "arrived_at"
  | "work_started_at"
  | "completed_at"
  | "invoice_generated_at";

function redirectWithActionError(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected action failure";
  redirect(`${path}?status=error&message=${encodeURIComponent(message)}`);
}

function appendRecurringParams(params: URLSearchParams, input: {
  recurrence: RecurringVisitGenerationResult | null;
  recurrenceError: string | null;
}) {
  if (input.recurrenceError) {
    params.set("recurring", "warning");
    params.set("message", input.recurrenceError);
    return;
  }

  if (!input.recurrence) return;

  params.set("recurring", input.recurrence.idempotencyResult);
  params.set("recurring_reason", input.recurrence.reason);
  if (input.recurrence.newVisitId) params.set("next_visit_id", input.recurrence.newVisitId);
  if (input.recurrence.scheduledDate) params.set("next_date", input.recurrence.scheduledDate);
}

type VisitContext = {
  id: string;
  organization_id: string;
  status: string;
  route_started_at: string | null;
  arrived_at: string | null;
  work_started_at: string | null;
  completed_at: string | null;
  invoice_generated_at: string | null;
};

function parseTargetStatus(value: FormDataEntryValue | null): CanonicalVisitState | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (["scheduled", "en_route", "arrived", "in_progress", "completed", "invoice_generated"].includes(raw)) {
    return raw as CanonicalVisitState;
  }
  return null;
}

function isServiceVisitTimestampColumn(value: string | null | undefined): value is ServiceVisitTimestampColumn {
  return (
    value === "route_started_at" ||
    value === "arrived_at" ||
    value === "work_started_at" ||
    value === "completed_at" ||
    value === "invoice_generated_at"
  );
}

async function getVisitContext(visitId: string) {
  const supabase = createSupabaseServerClient();
  const [visitResult, invoiceResult] = await Promise.all([
    supabase
      .from("service_visits")
      .select("id, organization_id, status, route_started_at, arrived_at, work_started_at, completed_at, invoice_generated_at")
      .eq("id", visitId)
      .single(),
    supabase
      .from("invoices")
      .select("id, status")
      .eq("service_visit_id", visitId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  throwDbError(visitResult.error, "Failed to load visit before status update");
  throwDbError(invoiceResult.error, "Failed to load invoice context for visit");

  const visit = visitResult.data as VisitContext | null;
  if (!visit) throw new Error("Visit not found");

  const invoice = invoiceResult.data as { id: string; status: string } | null;
  const workflowState = deriveCanonicalState({
    status: visit.status,
    invoiceStatus: invoice?.status ?? null,
  });

  return {
    supabase,
    visit,
    invoice,
    workflowState,
  };
}

async function applyVisitStatusUpdate(input: {
  visit: VisitContext;
  nextStatus: string;
  timestampColumn?: string | null;
  eventType: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ recurrence: RecurringVisitGenerationResult | null; recurrenceError: string | null }> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const updates: ServiceVisitUpdate = {
    status: input.nextStatus,
    updated_at: now,
  };

  if (isServiceVisitTimestampColumn(input.timestampColumn)) {
    updates[input.timestampColumn] = now;
  }

  if (input.nextStatus === "completed") {
    updates.completed_at = now;
    updates.completion_timestamp = now;
  }

  const updateResult = await supabase
    .from("service_visits")
    .update(updates)
    .eq("id", input.visit.id)
    .select("id, status")
    .single();

  throwDbError(updateResult.error, "Failed to update visit status");

  const routeStopStatus =
    input.nextStatus === "en_route"
      ? "en_route"
      : input.nextStatus === "arrived"
        ? "arrived"
        : input.nextStatus === "completed"
          ? "completed"
          : input.nextStatus === "needs_follow_up"
            ? "skipped"
            : null;

  if (routeStopStatus) {
    await supabase
      .from("route_stops")
      .update({ status: routeStopStatus, updated_at: now })
      .eq("service_visit_id", input.visit.id);
  }

  await logEvent({
    organizationId: input.visit.organization_id,
    actorUserId: input.actorUserId,
    entityType: "service_visit",
    entityId: input.visit.id,
    eventType: input.eventType,
    previousState: { status: input.visit.status },
    newState: { status: input.nextStatus },
    metadata: {
      source: "today_page",
      ...(input.metadata ?? {}),
    },
  });

  let recurrence: RecurringVisitGenerationResult | null = null;
  let recurrenceError: string | null = null;

  if (input.nextStatus === "completed") {
    try {
      recurrence = await generateNextVisitFromCompletedVisit({
        organizationId: input.visit.organization_id,
        completedVisitId: input.visit.id,
        actorUserId: input.actorUserId,
      });
    } catch (error) {
      recurrenceError = error instanceof Error ? error.message : "Recurring generation failed.";
      await logEvent({
        organizationId: input.visit.organization_id,
        actorUserId: input.actorUserId,
        entityType: "service_visit",
        entityId: input.visit.id,
        eventType: "recurring_visit_generation_failed",
        metadata: {
          completed_visit_id: input.visit.id,
          error: recurrenceError,
          source: "today_page",
        },
      });
    }
  }

  return { recurrence, recurrenceError };
}

export async function advanceToNextCanonicalStep(visitId: string, targetStatus?: CanonicalVisitState) {
  const auth = await requirePermission(PERMISSIONS.runExecute);

  const { visit, workflowState } = await getVisitContext(visitId);

  if (workflowState === "invoice_generated") {
    throw new Error("This stop is already in review.");
  }

  const nextTarget: CanonicalVisitState =
    targetStatus ??
    (workflowState === "scheduled"
      ? "en_route"
      : workflowState === "en_route"
        ? "arrived"
        : workflowState === "arrived"
          ? "in_progress"
          : workflowState === "in_progress"
            ? "completed"
            : workflowState);

  if (nextTarget === workflowState) {
    throw new Error("No next transition available from current status.");
  }

  const transitionPlan = buildForwardTransitionPlan({
    current: workflowState,
    target: nextTarget,
  });

  let recurringFeedback: { recurrence: RecurringVisitGenerationResult | null; recurrenceError: string | null } = {
    recurrence: null,
    recurrenceError: null,
  };

  for (const step of transitionPlan) {
    const feedback = await applyVisitStatusUpdate({
      visit,
      nextStatus: step.status,
      timestampColumn: step.timestampColumn,
      eventType: step.eventType ?? `visit_${step.status}`,
      actorUserId: auth.userId,
      metadata:
        transitionPlan.length > 1
          ? {
              implied: true,
              skip_ahead: true,
              final_target: nextTarget,
            }
          : undefined,
    });
    if (step.status === "completed") {
      recurringFeedback = feedback;
    }
    visit.status = step.status;
  }

  revalidatePath("/today");
  revalidatePath("/service-visits");
  revalidatePath("/schedule");
  revalidatePath("/");
  return recurringFeedback;
}

export async function advanceVisitAction(visitId: string, formData: FormData) {
  try {
    const target = parseTargetStatus(formData.get("targetStatus"));
    const feedback = await advanceToNextCanonicalStep(visitId, target ?? undefined);
    const params = new URLSearchParams({ status: "updated", visit: visitId });
    appendRecurringParams(params, feedback);
    redirect(`/today?${params.toString()}`);
  } catch (error) {
    redirectWithActionError("/today", error);
  }
}

export async function revertVisitStepAction(visitId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    const reason = String(formData.get("reason") ?? "").trim();
    const { supabase, visit, invoice, workflowState } = await getVisitContext(visitId);

  const target = getRevertTarget(workflowState);
  if (!target) {
    throw new Error("Undo is not available for this stop yet.");
  }

  const revertPlan = buildRevertPlan({ current: workflowState, target });
  const now = new Date().toISOString();

  if (workflowState === "invoice_generated") {
    if (!invoice) {
      throw new Error("Invoice context is missing for this review stop.");
    }

    const paymentsResult = await supabase
      .from("payments")
      .select("id, status")
      .eq("invoice_id", invoice.id);
    throwDbError(paymentsResult.error, "Failed to load invoice payments for undo");
    const payments = paymentsResult.data ?? [];
    const paymentIds = payments.map((payment) => payment.id);

    if (payments.some((payment) => payment.status === "received" || payment.status === "reconciled")) {
      throw new Error("Cannot undo invoice generation after payment was received or reconciled.");
    }

    const invoiceUpdate = await supabase
      .from("invoices")
      .update({
        status: "voided",
        updated_at: now,
      })
      .eq("id", invoice.id);
    throwDbError(invoiceUpdate.error, "Failed to void invoice during undo");

    if (payments.length) {
      const paymentUpdate = await supabase
        .from("payments")
        .update({ status: "cancelled", updated_at: now })
        .eq("invoice_id", invoice.id);
      throwDbError(paymentUpdate.error, "Failed to cancel expected payment during undo");
    }

    await logEvent({
      organizationId: visit.organization_id,
      entityType: "invoice",
      entityId: invoice.id,
      eventType: "invoice_generation_reverted",
      metadata: {
        service_visit_id: visit.id,
        payment_ids: paymentIds,
        reason: reason || null,
      },
    });
  }

  const fieldsToClear = Array.from(new Set(revertPlan.clearFields)).concat(["invoice_generated_at"]);
  const updates: ServiceVisitUpdate = {
    status: target,
    updated_at: now,
  };

  for (const field of fieldsToClear) {
    if (field === "completed_at") {
      updates.completed_at = null;
      updates.completion_timestamp = null;
      continue;
    }
    if (isServiceVisitTimestampColumn(field)) {
      updates[field] = null;
    }
  }

  const visitUpdate = await supabase.from("service_visits").update(updates).eq("id", visitId);
  throwDbError(visitUpdate.error, "Failed to revert visit status");

  const generatedNextResult =
    workflowState === "completed" && target === "in_progress"
      ? await supabase
          .from("service_visits")
          .select("id, scheduled_date, status")
          .eq("generated_from_visit_id", visit.id)
          .eq("generation_reason", "recurring_completion")
          .not("status", "in", "(cancelled,canceled,skipped)")
      : { data: [], error: null };
  throwDbError(generatedNextResult.error, "Failed to load generated next visits during undo");
  const generatedNextVisits = (generatedNextResult.data ?? []) as Array<{
    id: string;
    scheduled_date: string;
    status: string;
  }>;

  await logEvent({
    organizationId: visit.organization_id,
    entityType: "service_visit",
    entityId: visit.id,
    eventType: "visit_status_reverted",
    previousState: {
      status: workflowState,
    },
    newState: {
      status: target,
    },
    metadata: {
      previous_status: workflowState,
      new_status: target,
      cleared_fields: fieldsToClear,
      affected_records: {
        invoice_id: invoice?.id ?? null,
        generated_next_visit_ids: generatedNextVisits.map((nextVisit) => nextVisit.id),
      },
      recurring_generation_undo_behavior: generatedNextVisits.length
        ? "generated_next_visit_left_scheduled"
        : "no_generated_next_visit_found",
      reason: reason || null,
    },
  });

  if (generatedNextVisits.length) {
    await logEvent({
      organizationId: visit.organization_id,
      entityType: "service_visit",
      entityId: visit.id,
      eventType: "recurring_visit_left_scheduled_after_undo",
      metadata: {
        reverted_visit_id: visit.id,
        generated_next_visits: generatedNextVisits,
        reason: reason || null,
      },
    });
  }

  revalidatePath("/today");
  revalidatePath("/invoices");
  revalidatePath("/payments");
    redirect(`/today?status=reverted&visit=${visitId}`);
  } catch (error) {
    redirectWithActionError("/today", error);
  }
}

export async function flagFollowUpAction(visitId: string) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    const { supabase, visit } = await getVisitContext(visitId);
    const now = new Date().toISOString();

  const updateResult = await supabase
    .from("service_visits")
    .update({
      status: "needs_follow_up",
      updated_at: now,
    })
    .eq("id", visit.id);
  throwDbError(updateResult.error, "Failed to flag follow-up");

  await supabase
    .from("route_stops")
    .update({ status: "skipped", updated_at: now })
    .eq("service_visit_id", visit.id);

  await logEvent({
    organizationId: visit.organization_id,
    entityType: "service_visit",
    entityId: visit.id,
    eventType: "visit_follow_up_flagged",
    previousState: { status: visit.status },
    newState: { status: "needs_follow_up" },
    metadata: {
      source: "today_page",
    },
  });

  revalidatePath("/today");
    redirect(`/today?status=follow_up_flagged&visit=${visitId}`);
  } catch (error) {
    redirectWithActionError("/today", error);
  }
}

export async function addIssueAction(visitId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    const supabase = createSupabaseServerClient();

  const title = String(formData.get("title") ?? "").trim();
  const severity = String(formData.get("severity") ?? "medium").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) throw new Error("Issue title is required.");

  const visitResult = await supabase
    .from("service_visits")
    .select("id, organization_id, property_id")
    .eq("id", visitId)
    .single();

  throwDbError(visitResult.error, "Failed to load visit for issue creation");
  if (!visitResult.data) throw new Error("Visit not found");

  const issueResult = await supabase
    .from("issues")
    .insert({
      organization_id: visitResult.data.organization_id,
      service_visit_id: visitResult.data.id,
      property_id: visitResult.data.property_id,
      title,
      description: description || null,
      severity,
      status: "open",
    })
    .select("id")
    .single();

  throwDbError(issueResult.error, "Failed to create issue");
  const issueRow = issueResult.data as { id: string } | null;
  if (!issueRow) {
    throw new Error("Issue creation returned no id");
  }

  await logEvent({
    organizationId: visitResult.data.organization_id,
    entityType: "issue",
    entityId: issueRow.id,
    eventType: "issue_created",
    metadata: {
      service_visit_id: visitId,
      severity,
    },
  });

  revalidatePath("/today");
  revalidatePath("/issues");
    redirect(`/today?status=issue_created&visit=${visitId}`);
  } catch (error) {
    redirectWithActionError("/today", error);
  }
}

export async function generateInvoiceDraftAction(visitId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.invoicesWrite);
    const dueDays = Number(formData.get("dueDays") ?? 14);
    const method = String(formData.get("paymentMethod") ?? "venmo") as
    | "venmo"
    | "cash"
    | "check"
    | "credit_card_placeholder";

  if (!Number.isFinite(dueDays) || dueDays < 0 || dueDays > 180) {
    throw new Error("Due days must be between 0 and 180.");
  }

  const invoiceResult = await generateInvoiceDraftFromCompletedVisit({
    serviceVisitId: visitId,
    dueDays,
    paymentMethod: method,
  });

  const { supabase, visit } = await getVisitContext(visitId);
  const now = new Date().toISOString();
  const visitUpdate = await supabase
    .from("service_visits")
    .update({ invoice_generated_at: now, updated_at: now })
    .eq("id", visitId);
  throwDbError(visitUpdate.error, "Failed to mark invoice generation timestamp");

  await logEvent({
    organizationId: visit.organization_id,
    entityType: "service_visit",
    entityId: visitId,
    eventType: "invoice_generated",
    previousState: { status: visit.status },
    newState: { status: visit.status },
    metadata: { source: "today_page" },
  });

  revalidatePath("/today");
  revalidatePath("/invoices");
  revalidatePath("/payments");
    const params = new URLSearchParams({ invoice_generated: visitId });
    if (invoiceResult.expectedPaymentResult !== "created") {
      params.set("invoice_payment", invoiceResult.expectedPaymentResult);
    }
    redirect(`/today?${params.toString()}`);
  } catch (error) {
    redirectWithActionError("/today", error);
  }
}

export async function markPaymentReceivedAction(paymentId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.paymentsRecord);
    const method = String(formData.get("method") ?? "cash") as "venmo" | "cash" | "check";
    const reference = String(formData.get("reference") ?? "").trim();

  if (!["venmo", "cash", "check"].includes(method)) {
    throw new Error("Invalid manual payment method.");
  }

  await markPaymentManuallyReceived({
    paymentId,
    method,
    reference: reference || null,
  });

  revalidatePath("/today");
  revalidatePath("/invoices");
    revalidatePath("/payments");
  } catch (error) {
    redirectWithActionError("/today", error);
  }
}

export async function uploadTodayPhotoAction(visitId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.runExecute);
    const photoType = String(formData.get("photoType") ?? "after") as "before" | "after" | "issue";
    const caption = String(formData.get("caption") ?? "").trim();
    const customerVisible = (formData.get("customerVisible") as string) === "on";
    const file = formData.get("photoFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Photo file is required.");
  }

  await uploadVisitPhoto({
    visitId,
    photoType,
    caption: caption || null,
    customerVisible,
    file,
  });

  revalidatePath("/today");
  revalidatePath(`/service-visits/${visitId}`);
    redirect(`/today?status=photo_uploaded&visit=${visitId}`);
  } catch (error) {
    redirectWithActionError("/today", error);
  }
}
