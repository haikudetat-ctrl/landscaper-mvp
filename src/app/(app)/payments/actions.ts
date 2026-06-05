"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { markPaymentManuallyReceived } from "@/lib/db/invoices";

export async function markPaymentPaidAction(paymentId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.paymentsRecord);
  const method = String(formData.get("method") ?? "cash") as "venmo" | "cash" | "check";
  const reference = String(formData.get("reference") ?? "").trim();

  if (!paymentId) throw new Error("Payment id is required.");
  if (!["venmo", "cash", "check"].includes(method)) {
    throw new Error("Unsupported payment method for manual confirmation.");
  }

  await markPaymentManuallyReceived({
    paymentId,
    method,
    reference: reference || null,
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/");
}
