"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { transitionServiceVisitState } from "@/lib/db/events";
import { markVisitCompleted, markVisitPendingReactivation, markVisitSkipped } from "@/lib/db/service-visits";
import { uploadVisitPhoto } from "@/lib/db/photos";
import { recordPayment } from "@/lib/db/invoices";
import { saveTodayRunState, type RunPhase } from "@/lib/db/run-state";
import { paymentMethods } from "@/lib/utils/constants";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function completeRunVisitAction(visitId: string) {
  await requirePermission(PERMISSIONS.runExecute);
  await markVisitCompleted(visitId);
  await saveTodayRunState({
    phase: "running",
    activeVisitId: null,
    confirmedToday: true,
  });
  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  return { ok: true };
}

export async function startRunVisitAction(visitId: string) {
  await requirePermission(PERMISSIONS.runExecute);
  await transitionServiceVisitState({
    visitId,
    eventType: "visit_started",
  });
  await saveTodayRunState({
    phase: "running",
    activeVisitId: visitId,
    confirmedToday: true,
  });
  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  return { ok: true };
}

export async function completeRunVisitWithPhotoAction(visitId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.runExecute);

  const file = formData.get("photoFile");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Attach a photo before completing this visit.");
  }

  await uploadVisitPhoto({
    visitId,
    photoType: "after",
    caption: readString(formData, "caption") || "Mobile run completion photo",
    file,
  });
  await markVisitCompleted(visitId);
  await saveTodayRunState({
    phase: "running",
    activeVisitId: null,
    confirmedToday: true,
  });

  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  return { ok: true };
}

export async function skipRunVisitAction(visitId: string, reason: string, note: string | null) {
  await requirePermission(PERMISSIONS.runExecute);
  await markVisitSkipped(visitId, reason, note);
  await saveTodayRunState({
    phase: "running",
    activeVisitId: null,
    confirmedToday: true,
  });
  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  return { ok: true };
}

export async function removeRunVisitFromTodayAction(visitId: string) {
  await requirePermission(PERMISSIONS.runExecute);
  await markVisitPendingReactivation(visitId);
  await saveTodayRunState({
    phase: "confirm",
    activeVisitId: null,
    confirmedToday: false,
  });
  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  return { ok: true };
}

export async function markRunPaymentCollectedAction(formData: FormData) {
  await requirePermission(PERMISSIONS.paymentsRecord);

  const invoiceId = readString(formData, "invoiceId");
  const method = readString(formData, "method");
  const amount = Number(formData.get("amount") ?? 0);
  const reference = readString(formData, "reference");

  if (!invoiceId) throw new Error("Invoice is required.");
  if (!paymentMethods.includes(method as (typeof paymentMethods)[number])) {
    throw new Error("Payment method is not supported.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  await recordPayment({
    invoice_id: invoiceId,
    amount,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: method,
    reference_note: reference || "Collected from mobile daily run",
  });

  revalidatePath("/run");
  revalidatePath("/invoices");
  return { ok: true };
}

export async function saveRunProgressAction(input: {
  phase: RunPhase;
  activeVisitId?: string | null;
  confirmedToday?: boolean;
}) {
  await requirePermission(PERMISSIONS.runExecute);
  await saveTodayRunState({
    phase: input.phase,
    activeVisitId: input.activeVisitId ?? null,
    confirmedToday: input.confirmedToday ?? false,
  });
  revalidatePath("/run");
  return { ok: true };
}
