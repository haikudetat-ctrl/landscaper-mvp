import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Inserts, Tables } from "@/lib/types/database";
import type { ClientImportRowInput } from "@/lib/validation/client-import";
import { throwDbError } from "@/lib/db/shared";

export type ClientImportCreatedRow = {
  rowId: string;
  client: Pick<Tables<"clients">, "id" | "full_name">;
  property: Pick<Tables<"properties">, "id" | "street_1"> | null;
  servicePlan: Pick<Tables<"service_plans">, "id" | "plan_name"> | null;
};

export type ClientImportResult = {
  created: ClientImportCreatedRow[];
};

function hasPropertyDetails(row: ClientImportRowInput) {
  return Boolean(row.street1 || row.city || row.state || row.postalCode || row.propertyName);
}

function hasPlanDetails(row: ClientImportRowInput) {
  return Boolean(row.serviceTypeId || row.planName || row.startDate || row.quotedPrice !== null);
}

function normalizeFrequency(value: ClientImportRowInput["frequency"]) {
  return value === "custom-interval" ? "custom_interval" : value;
}

export async function importClientsWithPlans(rows: ClientImportRowInput[]): Promise<ClientImportResult> {
  const supabase = createSupabaseServerClient();
  const created: ClientImportCreatedRow[] = [];

  for (const row of rows) {
    const clientResult = await supabase
      .from("clients")
      .insert({
        full_name: row.clientName,
        primary_email: row.email || null,
        primary_phone: row.phone || null,
        billing_notes: row.billingNotes || null,
        cash_collection_notes: row.notes || null,
        payment_method_preference: row.paymentMethod,
        is_active: true,
      })
      .select("id, full_name")
      .single();

    throwDbError(clientResult.error, `Failed to import ${row.clientName}`);
    if (!clientResult.data) {
      throw new Error(`Client import returned no record for ${row.clientName}`);
    }

    let property: ClientImportCreatedRow["property"] = null;
    let servicePlan: ClientImportCreatedRow["servicePlan"] = null;

    if (hasPropertyDetails(row)) {
      const propertyInput: Inserts<"properties"> = {
        client_id: clientResult.data.id,
        property_name: row.propertyName || null,
        street_1: row.street1 || "",
        street_2: row.street2 || null,
        city: row.city || "",
        state: row.state || "",
        postal_code: row.postalCode || "",
        access_notes: row.accessNotes || null,
        service_notes: row.notes || null,
        is_active: true,
      };

      const propertyResult = await supabase
        .from("properties")
        .insert(propertyInput)
        .select("id, street_1")
        .single();

      throwDbError(propertyResult.error, `Failed to import property for ${row.clientName}`);
      if (!propertyResult.data) {
        throw new Error(`Property import returned no record for ${row.clientName}`);
      }

      property = propertyResult.data;
    }

    if (hasPlanDetails(row) && property) {
      const servicePlanInput: Inserts<"service_plans"> = {
        property_id: property.id,
        service_type_id: row.serviceTypeId || "",
        plan_name: row.planName || `${row.clientName} service plan`,
        frequency_type: normalizeFrequency(row.frequency),
        day_of_week: row.dayOfWeek,
        interval_count: row.intervalDays,
        start_date: row.startDate || "",
        quoted_price: row.quotedPrice ?? 0,
        status: row.status,
        notes: row.notes || null,
        auto_generate_visits: true,
        billing_mode: "per_visit",
      };

      const servicePlanResult = await supabase
        .from("service_plans")
        .insert(servicePlanInput)
        .select("id, plan_name")
        .single();

      throwDbError(servicePlanResult.error, `Failed to import service plan for ${row.clientName}`);
      if (!servicePlanResult.data) {
        throw new Error(`Service plan import returned no record for ${row.clientName}`);
      }

      servicePlan = servicePlanResult.data;
    }

    created.push({
      rowId: row.id,
      client: clientResult.data,
      property,
      servicePlan,
    });
  }

  return { created };
}
