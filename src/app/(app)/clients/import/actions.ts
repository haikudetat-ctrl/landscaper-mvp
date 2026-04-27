"use server";

import { revalidatePath } from "next/cache";

import { importClientsWithPlans, type ClientImportResult } from "@/lib/db/client-import";
import { clientImportPayloadSchema, type ClientImportRowInput } from "@/lib/validation/client-import";

export type ClientImportFormState = {
  error: string | null;
  result: ClientImportResult | null;
};

type RawImportRow = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRows(rawRows: RawImportRow[]): ClientImportRowInput[] {
  return rawRows.map((row, index) => ({
    id: text(row.id) || `row-${index + 1}`,
    clientName: text(row.clientName),
    email: text(row.email),
    phone: text(row.phone),
    paymentMethod: text(row.paymentMethod) || "venmo",
    billingNotes: text(row.billingNotes),
    propertyName: text(row.propertyName),
    street1: text(row.street1),
    street2: text(row.street2),
    city: text(row.city),
    state: text(row.state),
    postalCode: text(row.postalCode),
    accessNotes: text(row.accessNotes),
    serviceTypeId: text(row.serviceTypeId),
    planName: text(row.planName),
    frequency: text(row.frequency) || "weekly",
    dayOfWeek: numberOrNull(row.dayOfWeek),
    intervalDays: numberOrNull(row.intervalDays),
    startDate: text(row.startDate),
    quotedPrice: numberOrNull(row.quotedPrice),
    status: text(row.status) || "active",
    notes: text(row.notes),
  })) as ClientImportRowInput[];
}

function validateCompleteSections(rows: ClientImportRowInput[]) {
  for (const [index, row] of rows.entries()) {
    const rowLabel = `Row ${index + 1}`;
    const hasProperty = Boolean(row.propertyName || row.street1 || row.city || row.state || row.postalCode);
    const hasPlan = Boolean(row.serviceTypeId || row.planName || row.startDate || row.quotedPrice !== null);

    if (hasProperty && (!row.street1 || !row.city || !row.state || !row.postalCode)) {
      return `${rowLabel}: property rows need street, city, state, and postal code.`;
    }

    if (hasPlan && !hasProperty) {
      return `${rowLabel}: add property details before attaching a service plan.`;
    }

    if (hasPlan && (!row.serviceTypeId || !row.startDate || row.quotedPrice === null)) {
      return `${rowLabel}: service plans need service type, start date, and quoted price.`;
    }

    if (row.frequency === "custom-interval" && !row.intervalDays) {
      return `${rowLabel}: custom interval plans need an interval in days.`;
    }
  }

  return null;
}

export async function importClientsAction(
  _previousState: ClientImportFormState,
  formData: FormData,
): Promise<ClientImportFormState> {
  const payload = formData.get("payload");

  if (typeof payload !== "string") {
    return { error: "Import payload is missing.", result: null };
  }

  let rawRows: RawImportRow[];

  try {
    const parsed = JSON.parse(payload) as { rows?: RawImportRow[] };
    rawRows = Array.isArray(parsed.rows) ? parsed.rows : [];
  } catch {
    return { error: "Import payload could not be read.", result: null };
  }

  const normalizedRows = normalizeRows(rawRows);
  const parsed = clientImportPayloadSchema.safeParse({ rows: normalizedRows });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Import rows are invalid.",
      result: null,
    };
  }

  const sectionError = validateCompleteSections(parsed.data.rows);
  if (sectionError) {
    return { error: sectionError, result: null };
  }

  try {
    const result = await importClientsWithPlans(parsed.data.rows);

    revalidatePath("/");
    revalidatePath("/clients");
    revalidatePath("/properties");
    revalidatePath("/service-plans");

    return { error: null, result };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Import failed.",
      result: null,
    };
  }
}
