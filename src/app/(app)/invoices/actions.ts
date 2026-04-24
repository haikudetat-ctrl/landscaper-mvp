"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createInvoiceForVisit, recordPayment } from "@/lib/db/invoices";
import { maybeString, parseInteger } from "@/lib/db/shared";
import { createInvoiceSchema, recordPaymentSchema } from "@/lib/validation/invoice";

export async function createInvoiceFromVisitAction(visitId: string, formData: FormData) {
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
}

export async function recordPaymentAction(invoiceId: string, formData: FormData) {
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
  redirect(`/invoices/${invoiceId}`);
}
