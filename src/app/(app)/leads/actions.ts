"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { logEvent } from "@/lib/db/operational-events";
import { maybeString, throwDbError } from "@/lib/db/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";
import {
  leadClientLinkSchema,
  leadCommunicationSchema,
  leadConversionSchema,
  leadInternalNoteSchema,
  leadLostSchema,
  leadPropertyLinkSchema,
  leadSiteVisitSchema,
  leadStageSchema,
} from "@/lib/validation/lead";

type LeadForAction = {
  id: string;
  organization_id: string;
  status: string;
  name: string;
  phone: string;
  email: string | null;
  property_address: string;
  project_description: string;
  services_requested: string[];
  budget_range: string;
  converted_client_id: string | null;
  converted_property_id: string | null;
};

function goWithStatus(status: string, message?: string, leadId?: string): never {
  const params = new URLSearchParams({ status });
  if (message) params.set("message", message);
  if (leadId) params.set("lead", leadId);
  redirect(`/leads?${params.toString()}`);
}

function parseLeadActionForm(formData: FormData) {
  return {
    stage: maybeString(formData.get("stage")) ?? maybeString(formData.get("targetStatus")) ?? "",
  };
}

async function loadLeadForAction(input: {
  leadId: string;
  fallbackOrganizationId: string;
  actorUserId: string;
}): Promise<LeadForAction> {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("leads")
    .select(
      "id, organization_id, status, name, phone, email, property_address, project_description, services_requested, budget_range, converted_client_id, converted_property_id",
    )
    .eq("id", input.leadId)
    .single();

  throwDbError(result.error, "Failed to load lead");
  if (!result.data) {
    throw new Error("Lead not found.");
  }

  const lead = result.data as Omit<LeadForAction, "organization_id"> & {
    organization_id: string | null;
  };
  if (!lead.organization_id) {
    const claimResult = await supabase
      .rpc("claim_unowned_lead", {
        p_lead_id: input.leadId,
        p_organization_id: input.fallbackOrganizationId,
        p_actor_user_id: input.actorUserId,
      });
    throwDbError(claimResult.error, "Failed to claim unowned lead");
    if (!claimResult.data?.organization_id) {
      throw new Error("Lead could not be claimed for the current organization.");
    }

    return {
      id: claimResult.data.id,
      organization_id: claimResult.data.organization_id,
      status: claimResult.data.status,
      name: claimResult.data.name,
      phone: claimResult.data.phone,
      email: claimResult.data.email,
      property_address: claimResult.data.property_address,
      project_description: claimResult.data.project_description,
      services_requested: claimResult.data.services_requested,
      budget_range: claimResult.data.budget_range,
      converted_client_id: claimResult.data.converted_client_id,
      converted_property_id: claimResult.data.converted_property_id,
    };
  }

  return { ...lead, organization_id: lead.organization_id ?? input.fallbackOrganizationId };
}

async function persistLeadStage(input: {
  lead: LeadForAction;
  stage: string;
  organizationId: string;
  eventType?: string;
  metadata?: Json;
  patch?: Record<string, unknown>;
}) {
  const parsed = leadStageSchema.safeParse(input.stage);
  if (!parsed.success) {
    throw new Error("Unsupported lead stage.");
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const updateResult = await supabase
    .from("leads")
    .update({
      status: parsed.data,
      updated_at: now,
      last_activity_at: now,
      ...input.patch,
    })
    .eq("id", input.lead.id)
    .eq("organization_id", input.organizationId);

  throwDbError(updateResult.error, "Failed to update lead");

  await logEvent({
    organizationId: input.organizationId,
    entityType: "lead",
    entityId: input.lead.id,
    eventType: input.eventType ?? "lead_stage_changed",
    previousState: { status: input.lead.status },
    newState: { status: parsed.data, ...(input.patch ?? {}) } as Json,
    metadata: input.metadata ?? {},
  });
}

export async function updateLeadStageAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.clientsWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadStageSchema.safeParse(parseLeadActionForm(formData).stage);

  if (!parsed.success) {
    goWithStatus("error", "Unsupported lead stage.", leadId);
  }

  await persistLeadStage({
    lead,
    stage: parsed.data,
    organizationId,
    metadata: { intent: maybeString(formData.get("intent")) ?? "Manual stage update" },
  });

  revalidatePath("/leads");
  goWithStatus("updated", undefined, leadId);
}

export async function updateLeadWorkflowAction(leadId: string, formData: FormData) {
  await updateLeadStageAction(leadId, formData);
}

export async function moveLeadStageAction(leadId: string, stage: string) {
  const auth = await requirePermission(PERMISSIONS.clientsWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const parsed = leadStageSchema.safeParse(stage);

  if (!parsed.success) {
    throw new Error("Unsupported lead stage.");
  }

  if (lead.status === parsed.data) {
    return;
  }

  await persistLeadStage({
    lead,
    stage: parsed.data,
    organizationId: lead.organization_id,
    metadata: { intent: "Drag-and-drop stage move" },
  });

  revalidatePath("/leads");
}

export async function addLeadInternalNoteAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.clientsWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadInternalNoteSchema.safeParse({
    note: maybeString(formData.get("note")) ?? "",
  });

  if (!parsed.success) {
    goWithStatus("error", parsed.error.issues[0]?.message ?? "Invalid note.", leadId);
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const insertResult = await supabase.from("lead_enrichment").insert({
    lead_id: leadId,
    detail_type: "internal_note",
    detail_value: parsed.data.note,
    created_at: now,
  });
  throwDbError(insertResult.error, "Failed to add lead note");

  const updateResult = await supabase
    .from("leads")
    .update({ updated_at: now, last_activity_at: now })
    .eq("id", leadId)
    .eq("organization_id", organizationId);
  throwDbError(updateResult.error, "Failed to update lead activity timestamp");

  await logEvent({
    organizationId,
    entityType: "lead",
    entityId: lead.id,
    eventType: "lead_note_added",
    metadata: { note: parsed.data.note },
  });

  revalidatePath("/leads");
  goWithStatus("note_added", undefined, leadId);
}

export async function logLeadCommunicationAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.clientsWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadCommunicationSchema.safeParse({
    channel: maybeString(formData.get("channel")) ?? "call",
    recipient: maybeString(formData.get("recipient")) ?? "",
    subject: maybeString(formData.get("subject")) ?? "",
    note: maybeString(formData.get("note")) ?? "",
  });

  if (!parsed.success) {
    goWithStatus("error", parsed.error.issues[0]?.message ?? "Invalid communication.", leadId);
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const insertResult = await supabase.from("communication_log").insert({
    lead_id: lead.id,
    channel: parsed.data.channel,
    message_type: "manual_log",
    recipient: parsed.data.recipient,
    subject: parsed.data.subject || `${parsed.data.channel} logged for ${lead.name}`,
    status: "logged",
    sent_at: now,
    created_at: now,
  });
  throwDbError(insertResult.error, "Failed to log lead communication");

  const updateResult = await supabase
    .from("leads")
    .update({ updated_at: now, last_activity_at: now })
    .eq("id", lead.id)
    .eq("organization_id", organizationId);
  throwDbError(updateResult.error, "Failed to update lead activity timestamp");

  await logEvent({
    organizationId,
    entityType: "lead",
    entityId: lead.id,
    eventType: "lead_communication_logged",
    metadata: {
      channel: parsed.data.channel,
      recipient: parsed.data.recipient,
      subject: parsed.data.subject ?? null,
      note: parsed.data.note ?? null,
    },
  });

  revalidatePath("/leads");
  goWithStatus("communication_logged", undefined, leadId);
}

export async function linkLeadClientAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.clientsWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadClientLinkSchema.safeParse({
    clientId: maybeString(formData.get("clientId")) ?? "",
  });

  if (!parsed.success) {
    goWithStatus("error", parsed.error.issues[0]?.message ?? "Select a client.", leadId);
  }

  const supabase = createSupabaseServerClient();
  const clientResult = await supabase
    .from("clients")
    .select("id, organization_id")
    .eq("id", parsed.data.clientId)
    .eq("organization_id", organizationId)
    .single();
  throwDbError(clientResult.error, "Failed to verify client link");

  const now = new Date().toISOString();
  const updateResult = await supabase
    .from("leads")
    .update({
      converted_client_id: parsed.data.clientId,
      updated_at: now,
      last_activity_at: now,
    })
    .eq("id", lead.id)
    .eq("organization_id", organizationId);
  throwDbError(updateResult.error, "Failed to link lead to client");

  await logEvent({
    organizationId,
    entityType: "lead",
    entityId: lead.id,
    eventType: "lead_client_linked",
    newState: { converted_client_id: parsed.data.clientId },
  });

  revalidatePath("/leads");
  goWithStatus("linked", undefined, leadId);
}

export async function linkLeadPropertyAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.propertiesWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadPropertyLinkSchema.safeParse({
    propertyId: maybeString(formData.get("propertyId")) ?? "",
  });

  if (!parsed.success) {
    goWithStatus("error", parsed.error.issues[0]?.message ?? "Select a property.", leadId);
  }

  const supabase = createSupabaseServerClient();
  const propertyResult = await supabase
    .from("properties")
    .select("id, client_id, organization_id")
    .eq("id", parsed.data.propertyId)
    .eq("organization_id", organizationId)
    .single();
  throwDbError(propertyResult.error, "Failed to verify property link");

  const property = propertyResult.data as { id: string; client_id: string };
  const now = new Date().toISOString();
  const updateResult = await supabase
    .from("leads")
    .update({
      converted_client_id: property.client_id,
      converted_property_id: parsed.data.propertyId,
      updated_at: now,
      last_activity_at: now,
    })
    .eq("id", lead.id)
    .eq("organization_id", organizationId);
  throwDbError(updateResult.error, "Failed to link lead to property");

  await logEvent({
    organizationId,
    entityType: "lead",
    entityId: lead.id,
    eventType: "lead_property_linked",
    newState: {
      converted_client_id: property.client_id,
      converted_property_id: parsed.data.propertyId,
    },
  });

  revalidatePath("/leads");
  goWithStatus("linked", undefined, leadId);
}

export async function convertLeadAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.propertiesWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadConversionSchema.safeParse({
    clientId: maybeString(formData.get("clientId")) ?? "",
    propertyId: maybeString(formData.get("propertyId")) ?? "",
    fullName: maybeString(formData.get("fullName")) ?? "",
    email: maybeString(formData.get("email")) ?? "",
    phone: maybeString(formData.get("phone")) ?? "",
    propertyName: maybeString(formData.get("propertyName")) ?? "",
    street1: maybeString(formData.get("street1")) ?? "",
    street2: maybeString(formData.get("street2")) ?? "",
    city: maybeString(formData.get("city")) ?? "",
    state: maybeString(formData.get("state")) ?? "",
    postalCode: maybeString(formData.get("postalCode")) ?? "",
    serviceNotes: maybeString(formData.get("serviceNotes")) ?? "",
    accessNotes: maybeString(formData.get("accessNotes")) ?? "",
  });

  if (!parsed.success) {
    goWithStatus("error", parsed.error.issues[0]?.message ?? "Invalid conversion details.", leadId);
  }

  const supabase = createSupabaseServerClient();
  const values = parsed.data;
  const now = new Date().toISOString();
  let clientId: string | null = values.clientId || lead.converted_client_id || null;
  let propertyId: string | null = values.propertyId || lead.converted_property_id || null;

  if (clientId) {
    const clientResult = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("organization_id", organizationId)
      .single();
    throwDbError(clientResult.error, "Failed to verify selected client");
  } else {
    const clientResult = await supabase
      .from("clients")
      .insert({
        organization_id: organizationId,
        full_name: values.fullName,
        primary_email: values.email || null,
        primary_phone: values.phone,
        billing_notes: null,
        cash_collection_notes: `Converted from lead ${lead.id}. Source request: ${lead.project_description}`,
        payment_method_preference: "venmo",
        is_active: true,
      })
      .select("id")
      .single();
    throwDbError(clientResult.error, "Failed to create client from lead");
    clientId = clientResult.data?.id ?? null;
  }

  if (!clientId) {
    throw new Error("Conversion did not produce a client.");
  }

  if (propertyId) {
    const propertyResult = await supabase
      .from("properties")
      .select("id, client_id")
      .eq("id", propertyId)
      .eq("organization_id", organizationId)
      .single();
    throwDbError(propertyResult.error, "Failed to verify selected property");
    const property = propertyResult.data as { client_id: string };
    clientId = property.client_id;
  } else {
    const propertyResult = await supabase
      .from("properties")
      .insert({
        organization_id: organizationId,
        client_id: clientId,
        property_name: values.propertyName || null,
        street_1: values.street1,
        street_2: values.street2 || null,
        city: values.city,
        state: values.state,
        postal_code: values.postalCode,
        service_notes:
          values.serviceNotes ||
          [
            lead.services_requested.length ? `Services: ${lead.services_requested.join(", ")}` : null,
            lead.project_description,
            lead.budget_range ? `Budget: ${lead.budget_range}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        access_notes: values.accessNotes || null,
        gate_notes: null,
        is_active: true,
      })
      .select("id")
      .single();
    throwDbError(propertyResult.error, "Failed to create property from lead");
    propertyId = propertyResult.data?.id ?? null;
  }

  if (!propertyId) {
    throw new Error("Conversion did not produce a property.");
  }

  await persistLeadStage({
    lead,
    stage: "won",
    organizationId,
    eventType: "lead_converted_won",
    patch: {
      converted_client_id: clientId,
      converted_property_id: propertyId,
      converted_at: now,
      lost_reason: null,
    },
    metadata: {
      client_id: clientId,
      property_id: propertyId,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/clients");
  revalidatePath("/properties");
  revalidatePath("/");
  goWithStatus("converted", undefined, leadId);
}

export async function markLeadLostAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.clientsWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadLostSchema.safeParse({
    reason: maybeString(formData.get("reason")) ?? "",
  });

  if (!parsed.success) {
    goWithStatus("error", parsed.error.issues[0]?.message ?? "Lost reason is required.", leadId);
  }

  await persistLeadStage({
    lead,
    stage: "lost",
    organizationId,
    eventType: "lead_marked_lost",
    patch: { lost_reason: parsed.data.reason },
    metadata: { reason: parsed.data.reason },
  });

  revalidatePath("/leads");
  goWithStatus("lost", undefined, leadId);
}

export async function scheduleLeadSiteVisitAction(leadId: string, formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.serviceVisitsWrite);
  const lead = await loadLeadForAction({
    leadId,
    fallbackOrganizationId: auth.organizationId,
    actorUserId: auth.userId,
  });
  const organizationId = lead.organization_id;
  const parsed = leadSiteVisitSchema.safeParse({
    scheduledDate: maybeString(formData.get("scheduledDate")) ?? "",
    serviceTypeId: maybeString(formData.get("serviceTypeId")) ?? "",
    quotedPrice: formData.get("quotedPrice") ?? 0,
    notes: maybeString(formData.get("notes")) ?? "",
  });

  if (!parsed.success) {
    goWithStatus("error", parsed.error.issues[0]?.message ?? "Invalid site visit details.", leadId);
  }

  const supabase = createSupabaseServerClient();
  let visitId: string | null = null;

  if (lead.converted_property_id && parsed.data.serviceTypeId) {
    const insertResult = await supabase
      .from("service_visits")
      .insert({
        organization_id: organizationId,
        property_id: lead.converted_property_id,
        service_type_id: parsed.data.serviceTypeId,
        scheduled_date: parsed.data.scheduledDate,
        status: "scheduled",
        quoted_price: Math.round(parsed.data.quotedPrice ?? 0),
        operator_notes: parsed.data.notes || `Site visit scheduled from lead ${lead.id}.`,
      })
      .select("id")
      .single();
    throwDbError(insertResult.error, "Failed to create site visit");
    visitId = insertResult.data?.id ?? null;
  }

  await persistLeadStage({
    lead,
    stage: "site_visit_scheduled",
    organizationId,
    eventType: "lead_site_visit_scheduled",
    metadata: {
      scheduled_date: parsed.data.scheduledDate,
      service_type_id: parsed.data.serviceTypeId || null,
      service_visit_id: visitId,
      note: parsed.data.notes ?? null,
      created_service_visit: Boolean(visitId),
    },
  });

  revalidatePath("/leads");
  revalidatePath("/service-visits");
  revalidatePath("/schedule");
  goWithStatus(
    "site_visit_scheduled",
    visitId ? undefined : "Lead stage updated. Convert/link a property plus service type to create a service visit record.",
    leadId,
  );
}
