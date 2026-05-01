"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserMembership } from "@/lib/db/auth";
import { markVisitCompleted, markVisitPendingReactivation, markVisitSkipped } from "@/lib/db/service-visits";
import { uploadVisitPhoto } from "@/lib/db/photos";
import { recordPayment } from "@/lib/db/invoices";
import { paymentMethods } from "@/lib/utils/constants";

async function requireMembership() {
  const { user, membership } = await getCurrentUserMembership();
  if (!user || !membership) {
    throw new Error("You must be signed in with an organization membership.");
  }
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function completeRunVisitAction(visitId: string) {
  await requireMembership();
  await markVisitCompleted(visitId);
  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  return { ok: true };
}

export async function completeRunVisitWithPhotoAction(visitId: string, formData: FormData) {
  await requireMembership();

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

  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  return { ok: true };
}

export async function skipRunVisitAction(visitId: string, reason: string, note: string | null) {
  await requireMembership();
  await markVisitSkipped(visitId, reason, note);
  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  return { ok: true };
}

export async function removeRunVisitFromTodayAction(visitId: string) {
  await requireMembership();
  await markVisitPendingReactivation(visitId);
  revalidatePath("/run");
  revalidatePath("/");
  revalidatePath("/service-visits");
  revalidatePath(`/service-visits/${visitId}`);
  return { ok: true };
}

export async function markRunPaymentCollectedAction(formData: FormData) {
  await requireMembership();

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
