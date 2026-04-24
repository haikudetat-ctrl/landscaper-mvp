"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  serviceVisitRescheduleSchema,
  serviceVisitSkipSchema,
  serviceVisitUpdateSchema,
} from "@/lib/validation/service-visit";

export async function updateVisitAction(visitId: string, formData: FormData) {
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
    operator_notes: parsed.data.notes || null,
  });

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  redirect(`/service-visits/${visitId}`);
}

export async function completeVisitAction(visitId: string) {
  await markVisitCompleted(visitId);

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  revalidatePath("/");
  redirect(`/service-visits/${visitId}`);
}

export async function skipVisitAction(visitId: string, formData: FormData) {
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
  await markVisitPendingReactivation(visitId);

  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  revalidatePath("/");
  redirect(`/service-visits/${visitId}`);
}

export async function rescheduleVisitAction(visitId: string, formData: FormData) {
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
  const parsed = uploadVisitPhotoSchema.safeParse({
    visitId,
    photoType: (formData.get("photoType") as string) ?? "before",
    caption: maybeString(formData.get("caption")) ?? "",
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
    file,
  });

  revalidatePath(`/service-visits/${visitId}`);
  redirect(`/service-visits/${visitId}`);
}

export async function setVisitInvoiceAmountAction(visitId: string, formData: FormData) {
  const quotedPrice = Number(formData.get("priceCents") ?? 0);

  if (Number.isNaN(quotedPrice) || quotedPrice < 0) {
    throw new Error("Price must be a valid non-negative number.");
  }

  await updateServiceVisit(visitId, { quoted_price: quotedPrice });

  revalidatePath(`/service-visits/${visitId}`);
  redirect(`/service-visits/${visitId}`);
}
