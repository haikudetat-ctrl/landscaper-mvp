"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, updateClient } from "@/lib/db/clients";
import { maybeString, parseBoolean } from "@/lib/db/shared";
import { clientFormSchema } from "@/lib/validation/client";

export type CreateClientFormState = {
  error: string | null;
};

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

async function createClientFromForm(formData: FormData) {
  const parsed = clientFormSchema.safeParse(normalizeClientForm(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid client form input",
      created: null as Awaited<ReturnType<typeof createClient>> | null,
    };
  }

  const values = parsed.data;
  const fullName =
    (values.businessName ?? "").trim() ||
    `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim();

  if (!fullName) {
    return {
      error: "Client display name or first and last name is required.",
      created: null as Awaited<ReturnType<typeof createClient>> | null,
    };
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

  return { error: null, created };
}

export async function createClientAction(formData: FormData) {
  const postCreateAction = maybeString(formData.get("postCreateAction"));
  const result = await createClientFromForm(formData);

  if (result.error || !result.created) {
    throw new Error(result.error ?? "Unable to create client");
  }

  if (postCreateAction === "add_property") {
    redirect(`/properties/new?clientId=${result.created.id}&onboarding=1`);
  }

  redirect(`/clients/${result.created.id}`);
}

export async function createClientActionWithState(
  _previousState: CreateClientFormState,
  formData: FormData,
): Promise<CreateClientFormState> {
  const postCreateAction = maybeString(formData.get("postCreateAction"));
  const result = await createClientFromForm(formData);

  if (result.error || !result.created) {
    return { error: result.error ?? "Unable to create client" };
  }

  if (postCreateAction === "add_property") {
    redirect(`/properties/new?clientId=${result.created.id}&onboarding=1`);
  }

  redirect(`/clients/${result.created.id}`);
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
