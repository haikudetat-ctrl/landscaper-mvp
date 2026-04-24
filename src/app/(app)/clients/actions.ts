"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, updateClient } from "@/lib/db/clients";
import { maybeString, parseBoolean } from "@/lib/db/shared";
import { clientFormSchema } from "@/lib/validation/client";

function normalizeClientForm(formData: FormData) {
  return {
    firstName: maybeString(formData.get("firstName")) ?? "",
    lastName: maybeString(formData.get("lastName")) ?? "",
    businessName: maybeString(formData.get("businessName")) ?? "",
    email: maybeString(formData.get("email")) ?? "",
    phone: maybeString(formData.get("phone")) ?? "",
    billingAddress: maybeString(formData.get("billingAddress")) ?? "",
    notes: maybeString(formData.get("notes")) ?? "",
    isActive: parseBoolean(formData.get("isActive")),
  };
}

export async function createClientAction(formData: FormData) {
  const parsed = clientFormSchema.safeParse(normalizeClientForm(formData));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid client form input");
  }

  const values = parsed.data;
  const fullName =
    (values.businessName ?? "").trim() ||
    `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim();

  if (!fullName) {
    throw new Error("Client name is required.");
  }

  const created = await createClient({
    full_name: fullName,
    primary_email: values.email || null,
    primary_phone: values.phone || null,
    billing_notes: values.billingAddress || null,
    cash_collection_notes: values.notes || null,
    payment_method_preference: "venmo",
    is_active: values.isActive,
  });

  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${created.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const parsed = clientFormSchema.safeParse(normalizeClientForm(formData));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid client form input");
  }

  const values = parsed.data;
  const fullName =
    (values.businessName ?? "").trim() ||
    `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim();

  if (!fullName) {
    throw new Error("Client name is required.");
  }

  await updateClient(clientId, {
    full_name: fullName,
    primary_email: values.email || null,
    primary_phone: values.phone || null,
    billing_notes: values.billingAddress || null,
    cash_collection_notes: values.notes || null,
    is_active: values.isActive,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}
