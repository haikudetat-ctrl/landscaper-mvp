"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProperty, updateProperty } from "@/lib/db/properties";
import { maybeString, parseBoolean } from "@/lib/db/shared";
import { propertyFormSchema } from "@/lib/validation/property";

export type CreatePropertyFormState = {
  error: string | null;
};

function normalizePropertyForm(formData: FormData) {
  return {
    clientId: (formData.get("clientId") as string) ?? "",
    propertyName: maybeString(formData.get("propertyName")) ?? "",
    addressLine1: maybeString(formData.get("addressLine1")) ?? "",
    addressLine2: maybeString(formData.get("addressLine2")) ?? "",
    city: maybeString(formData.get("city")) ?? "",
    state: maybeString(formData.get("state")) ?? "",
    postalCode: maybeString(formData.get("postalCode")) ?? "",
    gateNotes: maybeString(formData.get("gateNotes")) ?? "",
    accessNotes: maybeString(formData.get("accessNotes")) ?? "",
    serviceNotes: maybeString(formData.get("serviceNotes")) ?? "",
    isActive: parseBoolean(formData.get("isActive")),
  };
}

async function createPropertyFromForm(formData: FormData) {
  const parsed = propertyFormSchema.safeParse(normalizePropertyForm(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid property data",
      created: null as Awaited<ReturnType<typeof createProperty>> | null,
    };
  }

  const values = parsed.data;

  const created = await createProperty({
    client_id: values.clientId,
    property_name: values.propertyName || null,
    street_1: values.addressLine1,
    street_2: values.addressLine2 || null,
    city: values.city,
    state: values.state,
    postal_code: values.postalCode,
    gate_notes: values.gateNotes || null,
    access_notes: values.accessNotes || null,
    service_notes: values.serviceNotes || null,
    is_active: values.isActive,
  });

  revalidatePath("/properties");
  revalidatePath("/");

  return { error: null, created };
}

export async function createPropertyAction(formData: FormData) {
  const postCreateAction = maybeString(formData.get("postCreateAction"));
  const result = await createPropertyFromForm(formData);

  if (result.error || !result.created) {
    throw new Error(result.error ?? "Unable to create property");
  }

  if (postCreateAction === "add_service_plan") {
    redirect(`/service-plans/new?propertyId=${result.created.id}&onboarding=1`);
  }

  redirect(`/properties/${result.created.id}`);
}

export async function createPropertyActionWithState(
  _previousState: CreatePropertyFormState,
  formData: FormData,
): Promise<CreatePropertyFormState> {
  const postCreateAction = maybeString(formData.get("postCreateAction"));
  const result = await createPropertyFromForm(formData);

  if (result.error || !result.created) {
    return { error: result.error ?? "Unable to create property" };
  }

  if (postCreateAction === "add_service_plan") {
    redirect(`/service-plans/new?propertyId=${result.created.id}&onboarding=1`);
  }

  redirect(`/properties/${result.created.id}`);
}

export async function updatePropertyAction(propertyId: string, formData: FormData) {
  const parsed = propertyFormSchema.safeParse(normalizePropertyForm(formData));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid property data");
  }

  const values = parsed.data;

  await updateProperty(propertyId, {
    client_id: values.clientId,
    property_name: values.propertyName || null,
    street_1: values.addressLine1,
    street_2: values.addressLine2 || null,
    city: values.city,
    state: values.state,
    postal_code: values.postalCode,
    gate_notes: values.gateNotes || null,
    access_notes: values.accessNotes || null,
    service_notes: values.serviceNotes || null,
    is_active: values.isActive,
  });

  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}`);
}
