"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  bulkRainDelayShift,
  markVisitCompleted,
  markVisitPendingReactivation,
  markVisitSkipped,
  rescheduleVisit,
  updateServiceVisit,
} from "@/lib/db/service-visits";
import { maybeString } from "@/lib/db/shared";
import { uploadVisitPhoto } from "@/lib/db/photos";
import { uploadVisitPhotoSchema } from "@/lib/validation/photo";
import {
  serviceVisitCompletionSchema,
  serviceVisitRescheduleSchema,
  serviceVisitSkipSchema,
  serviceVisitUpdateSchema,
} from "@/lib/validation/service-visit";

function recurringRedirectParams(input: Awaited<ReturnType<typeof markVisitCompleted>>) {
  if (input.recurrenceError) {
    return `?recurring=warning&message=${encodeURIComponent(input.recurrenceError)}`;
  }

  if (!input.recurrence) {
    return "";
  }

  const params = new URLSearchParams({
    recurring: input.recurrence.idempotencyResult,
    reason: input.recurrence.reason,
  });

  if (input.recurrence.newVisitId) params.set("nextVisitId", input.recurrence.newVisitId);
  if (input.recurrence.scheduledDate) params.set("nextDate", input.recurrence.scheduledDate);

  return `?${params.toString()}`;
}

export async function updateVisitAction(visitId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.serviceVisitsWrite);
  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const serviceTypeId = String(formData.get("serviceTypeId") ?? "").trim();
  const servicePlanId = String(formData.get("servicePlanId") ?? "").trim();
  const quotedPrice = Number(formData.get("quotedPrice") ?? 0);
  const parsed = serviceVisitUpdateSchema.safeParse({
    scheduledDate: (formData.get("scheduledDate") as string) ?? "",
    status: (formData.get("status") as string) ?? "scheduled",
    notes: maybeString(formData.get("notes")) ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid visit update data");
  }

  await updateServiceVisit(visitId, {
    scheduled_date: parsed.data.scheduledDate,
    status: parsed.data.status,
    property_id: propertyId || undefined,
    service_type_id: serviceTypeId || undefined,
    service_plan_id: servicePlanId || null,
    quoted_price: Number.isFinite(quotedPrice) ? Math.max(0, quotedPrice) : 0,
    operator_notes: parsed.data.notes || null,
  });

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  redirect(`/service-visits/${visitId}`);
}

export async function completeVisitAction(visitId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.serviceVisitsWrite);
  const parsed = serviceVisitCompletionSchema.safeParse({
    completionNotes: maybeString(formData.get("completionNotes")) ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid completion note");
  }

  const completionNotes = parsed.data.completionNotes || null;
  const result = await markVisitCompleted(visitId, {
    organizationId: auth.organizationId,
    actorUserId: auth.userId,
    completionNotes,
  });

  if (completionNotes) {
    const supabase = createSupabaseServerClient();
    const commentResult = await supabase.from("comments").insert({
      organization_id: auth.organizationId,
      author_user_id: auth.userId,
      entity_type: "visit",
      entity_id: visitId,
      body: completionNotes,
    });

    if (commentResult.error) {
      throw new Error(`Failed to save completion note: ${commentResult.error.message}`);
    }
  }

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  revalidatePath("/schedule");
  revalidatePath("/");
  redirect(`/service-visits/${visitId}${recurringRedirectParams(result)}`);
}

export async function skipVisitAction(visitId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.serviceVisitsWrite);
  const parsed = serviceVisitSkipSchema.safeParse({
    skippedReason: maybeString(formData.get("skippedReason")) ?? "",
    skipNote: maybeString(formData.get("skipNote")) ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid skip details");
  }

  await markVisitSkipped(visitId, parsed.data.skippedReason, parsed.data.skipNote || null);

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  revalidatePath("/");
  redirect(`/service-visits/${visitId}`);
}

export async function markPendingReactivationAction(visitId: string) {
  await requirePermission(PERMISSIONS.serviceVisitsWrite);
  await markVisitPendingReactivation(visitId);

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  revalidatePath("/");
  redirect(`/service-visits/${visitId}`);
}

export async function rescheduleVisitAction(visitId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.serviceVisitsWrite);
  const parsed = serviceVisitRescheduleSchema.safeParse({
    scheduledDate: (formData.get("scheduledDate") as string) ?? "",
    notes: maybeString(formData.get("notes")) ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reschedule input");
  }

  await rescheduleVisit(visitId, parsed.data.scheduledDate, parsed.data.notes || null);

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  revalidatePath("/");
  redirect(`/service-visits/${visitId}`);
}

export async function rainDelayShiftAction(formData: FormData) {
  await requirePermission(PERMISSIONS.scheduleShift);
  const fromDate = (formData.get("fromDate") as string) ?? "";
  const reason = maybeString(formData.get("reason")) ?? "Rain delay";

  if (!fromDate) {
    throw new Error("Date is required for rain-delay shift.");
  }

  await bulkRainDelayShift(fromDate, reason);

  revalidatePath("/service-visits");
  revalidatePath("/");
  redirect("/service-visits");
}

export async function uploadVisitPhotoAction(visitId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.serviceVisitsWrite);
  const parsed = uploadVisitPhotoSchema.safeParse({
    visitId,
    photoType: (formData.get("photoType") as string) ?? "before",
    caption: maybeString(formData.get("caption")) ?? "",
    issueId: maybeString(formData.get("issueId")) ?? undefined,
    customerVisible: (formData.get("customerVisible") as string) === "on",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid photo form input");
  }

  const file = formData.get("photoFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A photo file is required.");
  }

  await uploadVisitPhoto({
    visitId,
    photoType: parsed.data.photoType,
    caption: parsed.data.caption || null,
    issueId: parsed.data.issueId ?? null,
    customerVisible: parsed.data.customerVisible ?? false,
    file,
  });

  revalidatePath(`/service-visits/${visitId}`);
  redirect(`/service-visits/${visitId}`);
}

export async function setVisitInvoiceAmountAction(visitId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.serviceVisitsWrite);
  const quotedPrice = Number(formData.get("priceCents") ?? 0);

  if (Number.isNaN(quotedPrice) || quotedPrice < 0) {
    throw new Error("Price must be a valid non-negative number.");
  }

  await updateServiceVisit(visitId, { quoted_price: quotedPrice });

  revalidatePath(`/service-visits/${visitId}`);
  redirect(`/service-visits/${visitId}`);
}
