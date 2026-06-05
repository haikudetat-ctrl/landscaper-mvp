"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import {
  createInvoiceForVisit,
  markInvoiceSent,
  prepareInvoiceSendPreview,
  recordPayment,
} from "@/lib/db/invoices";
import { maybeString, parseInteger } from "@/lib/db/shared";
import { createInvoiceSchema, recordPaymentSchema } from "@/lib/validation/invoice";

export type CreateInvoiceFormState = {
  error: string | null;
  success?: string | null;
  createdId?: string | null;
};

function redirectWithActionError(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected action failure";
  redirect(`${path}?status=error&message=${encodeURIComponent(message)}`);
}

export async function createInvoiceFromVisitAction(visitId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.invoicesWrite);
    const dueDays = parseInteger(formData.get("dueDays")) ?? 14;

  const parsed = createInvoiceSchema.safeParse({
    visitId,
    dueDays,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice creation input");
  }

  const invoiceId = await createInvoiceForVisit(parsed.data.visitId, parsed.data.dueDays);

  revalidatePath("/invoices");
  revalidatePath("/service-visits");
  revalidatePath("/");
    redirect(`/invoices/${invoiceId}`);
  } catch (error) {
    redirectWithActionError("/invoices", error);
  }
}

export async function createInvoiceFromVisitSheetAction(
  visitId: string,
  _previousState: CreateInvoiceFormState,
  formData: FormData,
): Promise<CreateInvoiceFormState> {
  await requirePermission(PERMISSIONS.invoicesWrite);
  const dueDays = parseInteger(formData.get("dueDays")) ?? 14;

  const parsed = createInvoiceSchema.safeParse({
    visitId,
    dueDays,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid invoice creation input",
      success: null,
      createdId: null,
    };
  }

  const invoiceId = await createInvoiceForVisit(parsed.data.visitId, parsed.data.dueDays);

  revalidatePath("/invoices");
  revalidatePath("/service-visits");
  revalidatePath("/");

  return {
    error: null,
    success: "Invoice created successfully.",
    createdId: invoiceId,
  };
}

export async function recordPaymentAction(invoiceId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.paymentsRecord);
    const parsed = recordPaymentSchema.safeParse({
    invoiceId,
    amount: Number(formData.get("amountCents") ?? 0),
    paymentDate: (formData.get("paymentDate") as string) ?? "",
    paymentMethod: (formData.get("method") as string) ?? "other",
    reference: maybeString(formData.get("reference")) ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment input");
  }

  await recordPayment({
    invoice_id: parsed.data.invoiceId,
    amount: parsed.data.amount,
    payment_date: parsed.data.paymentDate,
    payment_method: parsed.data.paymentMethod,
    reference_note: parsed.data.reference || null,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/");
    redirect(`/invoices/${invoiceId}?payment_recorded=1`);
  } catch (error) {
    redirectWithActionError(`/invoices/${invoiceId}`, error);
  }
}

export async function sendInvoiceAction(invoiceId: string, formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.invoicesWrite);
    const includeCreditCardPlaceholder = (formData.get("includeCreditCardPlaceholder") as string) === "on";
    const useProvider = process.env.LOAM_EMAIL_PROVIDER === "enabled";
    const preview = await prepareInvoiceSendPreview({
    invoiceId,
    includeCreditCardPlaceholder,
  });

  await markInvoiceSent({
    invoiceId,
    previewBody: preview.body,
    recipient: preview.recipient,
    useProvider,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
    redirect(`/invoices/${invoiceId}?email_mode=${useProvider ? "sent" : "preview"}`);
  } catch (error) {
    redirectWithActionError(`/invoices/${invoiceId}`, error);
  }
}
