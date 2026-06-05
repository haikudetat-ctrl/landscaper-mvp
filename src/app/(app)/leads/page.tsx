import Link from "next/link";

import { ActivityNotes } from "@/components/comments/activity-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { listCommentsForEntities } from "@/lib/db/comments";
import { throwDbError } from "@/lib/db/shared";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatAddress, formatCurrencyFromCents, formatDate, formatDateTime } from "@/lib/utils/format";
import { leadStages } from "@/lib/validation/lead";

import {
  addLeadInternalNoteAction,
  convertLeadAction,
  linkLeadClientAction,
  linkLeadPropertyAction,
  logLeadCommunicationAction,
  markLeadLostAction,
  scheduleLeadSiteVisitAction,
  updateLeadStageAction,
} from "./actions";
import { LeadDragHandle, LeadDropColumn } from "./lead-drag-drop";

const stageLabels: Record<(typeof leadStages)[number], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  site_visit_scheduled: "Site Visit Scheduled",
  estimate_sent: "Estimate Sent",
  follow_up: "Follow Up",
  won: "Won",
  lost: "Lost",
};

type SearchParams = {
  q?: string;
  source?: string;
  stage?: string;
  priority?: string;
  status?: string;
  message?: string;
  lead?: string;
};

type LeadRecord = {
  id: string;
  organization_id: string | null;
  tenant_slug: string;
  source: string;
  status: string;
  name: string;
  phone: string;
  email: string | null;
  property_address: string;
  services_requested: string[];
  project_description: string;
  timeline: string;
  budget_range: string;
  preferred_contact_method: string;
  lost_reason: string | null;
  converted_client_id: string | null;
  converted_property_id: string | null;
  converted_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  lead_contact_preferences:
    | {
        sms_opt_in: boolean;
        sms_status_updates: boolean;
        consent_text: string;
        consented_at: string | null;
        phone: string;
      }
    | Array<{
        sms_opt_in: boolean;
        sms_status_updates: boolean;
        consent_text: string;
        consented_at: string | null;
        phone: string;
      }>
    | null;
  lead_enrichment:
    | Array<{
        id: string;
        detail_type: string;
        detail_value: string;
        created_at: string;
      }>
    | null;
  lead_photos:
    | Array<{
        id: string;
        storage_path: string;
        caption: string | null;
        created_at: string;
        signedUrl?: string | null;
      }>
    | null;
};

type ClientOption = {
  id: string;
  full_name: string;
  primary_email: string | null;
  primary_phone: string | null;
};

type PropertyOption = {
  id: string;
  client_id: string;
  property_name: string | null;
  street_1: string;
  street_2: string | null;
  city: string;
  state: string;
  postal_code: string;
};

type ServiceTypeOption = {
  id: string;
  label: string;
  is_active: boolean;
};

type TimelineEvent = {
  id: string;
  actor_user_id: string | null;
  entity_id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  previous_state: Record<string, unknown> | null;
  created_at: string;
};

type CommunicationEntry = {
  id: string;
  lead_id: string | null;
  channel: string;
  message_type: string;
  recipient: string;
  subject: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
};

type VisitEntry = {
  id: string;
  property_id: string;
  scheduled_date: string;
  status: string;
  quoted_price: number;
  service_types: { label: string } | { label: string }[] | null;
};

type InvoiceEntry = {
  id: string;
  invoice_number: string;
  client_id: string;
  property_id: string;
  amount_due: number;
  status: string;
  due_date: string;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function leadAgeLabel(value: string) {
  const days = daysSince(value) ?? 0;
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function activityLabel(value: string | null | undefined) {
  const days = daysSince(value);
  if (days === null) return "No activity";
  if (days === 0) return "Active today";
  if (days === 1) return "1 day quiet";
  return `${days} days quiet`;
}

function inferPriority(lead: Pick<LeadRecord, "timeline" | "budget_range" | "project_description" | "status" | "last_activity_at">) {
  const text = `${lead.timeline} ${lead.project_description}`.toLowerCase();
  if (lead.status === "new" && (daysSince(lead.last_activity_at) ?? 0) >= 2) return "urgent";
  if (text.includes("asap") || text.includes("urgent") || text.includes("immediately")) return "urgent";
  if (lead.budget_range.toLowerCase().includes("50k") || lead.budget_range.toLowerCase().includes("100k")) return "high";
  if (lead.status === "estimate_sent" || lead.status === "site_visit_scheduled") return "high";
  return "medium";
}

function nextBestAction(lead: LeadRecord) {
  switch (lead.status) {
    case "new":
      return "Contact and qualify";
    case "contacted":
      return "Qualify scope";
    case "qualified":
      return "Schedule site visit";
    case "site_visit_scheduled":
      return "Complete visit and prepare estimate";
    case "estimate_sent":
      return "Follow up on estimate";
    case "follow_up":
      return "Re-engage or mark lost";
    case "won":
      return lead.converted_property_id ? "Schedule first job" : "Link converted property";
    case "lost":
      return "Review reason";
    default:
      return "Review lead";
  }
}

function normalizeStage(status: string): (typeof leadStages)[number] {
  if ((leadStages as readonly string[]).includes(status)) return status as (typeof leadStages)[number];
  if (status === "estimate_scheduled") return "site_visit_scheduled";
  if (status === "stale") return "follow_up";
  return "new";
}

function parseAddress(address: string) {
  const [street = address, city = "", stateZip = ""] = address.split(",").map((part) => part.trim());
  const [state = "", ...zipParts] = stateZip.split(/\s+/).filter(Boolean);

  return {
    street1: street || address,
    city,
    state,
    postalCode: zipParts.join(" "),
  };
}

function relationName<T extends { label: string }>(value: T | T[] | null) {
  if (!value) return "Service";
  return Array.isArray(value) ? value[0]?.label ?? "Service" : value.label;
}

function humanizeStage(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = normalizeStage(value);
  return stageLabels[normalized] ?? value.replaceAll("_", " ");
}

function formatEventCopy(entry: TimelineEvent) {
  const metadata = entry.metadata ?? {};
  const previousState = entry.previous_state ?? {};
  const newState = entry.new_state ?? {};
  const previousStatus =
    typeof previousState === "object" && previousState && "status" in previousState
      ? humanizeStage(previousState.status)
      : null;
  const nextStatus =
    typeof newState === "object" && newState && "status" in newState
      ? humanizeStage(newState.status)
      : null;
  const intent =
    typeof metadata === "object" && metadata && typeof metadata.intent === "string"
      ? metadata.intent
      : null;
  const note =
    typeof metadata === "object" && metadata && typeof metadata.note === "string"
      ? metadata.note
      : null;
  const reason =
    typeof metadata === "object" && metadata && typeof metadata.reason === "string"
      ? metadata.reason
      : null;
  const channel =
    typeof metadata === "object" && metadata && typeof metadata.channel === "string"
      ? metadata.channel
      : null;
  const recipient =
    typeof metadata === "object" && metadata && typeof metadata.recipient === "string"
      ? metadata.recipient
      : null;
  const scheduledDate =
    typeof metadata === "object" && metadata && typeof metadata.scheduled_date === "string"
      ? metadata.scheduled_date
      : null;
  const clientId =
    typeof metadata === "object" && metadata && typeof metadata.client_id === "string"
      ? metadata.client_id
      : null;
  const propertyId =
    typeof metadata === "object" && metadata && typeof metadata.property_id === "string"
      ? metadata.property_id
      : null;

  switch (entry.event_type) {
    case "lead_claimed":
      return {
        title: "Lead added to your company",
        detail: "This older intake lead was connected to your account so it can be worked.",
      };
    case "lead_stage_changed":
    case "lead_status_changed":
      return {
        title: nextStatus ? `Lead moved to ${nextStatus}` : "Lead stage updated",
        detail: previousStatus ? `Previous stage: ${previousStatus}${intent ? ` · ${intent}` : ""}` : intent,
      };
    case "lead_note_added":
      return {
        title: "Internal note added",
        detail: note,
      };
    case "lead_communication_logged":
      return {
        title: channel ? `${channel[0]?.toUpperCase()}${channel.slice(1)} logged` : "Communication logged",
        detail: [recipient ? `With ${recipient}` : null, note].filter(Boolean).join(" · ") || null,
      };
    case "lead_site_visit_scheduled":
      return {
        title: "Site visit scheduled",
        detail: [scheduledDate ? formatDate(scheduledDate) : null, note].filter(Boolean).join(" · ") || null,
      };
    case "lead_converted_won":
      return {
        title: "Lead won and converted",
        detail: [clientId ? "Client record created or linked" : null, propertyId ? "Property record created or linked" : null]
          .filter(Boolean)
          .join(" · ") || null,
      };
    case "lead_marked_lost":
      return {
        title: "Lead marked lost",
        detail: reason,
      };
    case "lead_client_linked":
      return {
        title: "Client linked",
        detail: "This lead is now connected to an existing client.",
      };
    case "lead_property_linked":
      return {
        title: "Property linked",
        detail: "This lead is now connected to an existing property.",
      };
    default:
      return {
        title: entry.event_type
          .replace(/^lead_/, "")
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        detail: intent ?? note ?? reason,
      };
  }
}

function timelineForLead(input: {
  lead: LeadRecord;
  events: TimelineEvent[];
  communications: CommunicationEntry[];
  actorNames: Map<string, string>;
}) {
  const notes =
    input.lead.lead_enrichment
      ?.filter((entry) => entry.detail_type === "internal_note")
      .map((entry) => ({
        id: entry.id,
        kind: "note",
      title: "Internal note",
      detail: entry.detail_value,
      createdAt: entry.created_at,
      actorName: null,
    })) ?? [];
  const comms = input.communications.map((entry) => ({
    id: entry.id,
    kind: "communication",
    title: `${entry.channel[0]?.toUpperCase()}${entry.channel.slice(1)} logged`,
    detail: [entry.subject, entry.recipient].filter(Boolean).join(" · "),
    createdAt: entry.sent_at ?? entry.created_at,
    actorName: null,
  }));
  const events = input.events.map((entry) => ({
    id: entry.id,
    kind: "event",
    ...formatEventCopy(entry),
    createdAt: entry.created_at,
    actorName: entry.actor_user_id ? input.actorNames.get(entry.actor_user_id) ?? "Team member" : "System",
  }));

  return [
    {
      id: `${input.lead.id}-submitted`,
      kind: "system",
      title: "Lead submitted",
      detail: input.lead.source,
      createdAt: input.lead.created_at,
      actorName: "Website",
    },
    ...notes,
    ...comms,
    ...events,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function systemMessage(status?: string, message?: string) {
  if (!status) return null;
  if (status === "error") return { tone: "border-red-200 bg-red-50 text-red-800", text: message ?? "Lead action failed." };
  if (message) return { tone: "border-amber-200 bg-amber-50 text-amber-900", text: message };
  return { tone: "border-emerald-200 bg-emerald-50 text-emerald-800", text: "Lead workflow updated." };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePagePermission(PERMISSIONS.clientsRead);
  const auth = await getAuthorizationContext();
  const query = await searchParams;
  const supabase = createSupabaseServerClient();
  const { leadPhotoBucket } = getSupabaseEnv();

  let leadsQuery = supabase
    .from("leads")
    .select(
      "id, organization_id, tenant_slug, source, status, name, phone, email, property_address, services_requested, project_description, timeline, budget_range, preferred_contact_method, lost_reason, converted_client_id, converted_property_id, converted_at, last_activity_at, created_at, updated_at, lead_contact_preferences(*), lead_enrichment(*), lead_photos(*)",
    )
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (query.q?.trim()) {
    const search = query.q.trim();
    leadsQuery = leadsQuery.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,property_address.ilike.%${search}%,source.ilike.%${search}%`,
    );
  }

  if (query.source?.trim()) {
    leadsQuery = leadsQuery.eq("source", query.source.trim());
  }

  if (query.stage?.trim() && query.stage !== "all") {
    leadsQuery = leadsQuery.eq("status", query.stage.trim());
  }

  const [
    leadsResult,
    clientsResult,
    propertiesResult,
    serviceTypesResult,
  ] = await Promise.all([
    leadsQuery,
    supabase.from("clients").select("id, full_name, primary_email, primary_phone").order("full_name", { ascending: true }),
    supabase
      .from("properties")
      .select("id, client_id, property_name, street_1, street_2, city, state, postal_code")
      .order("street_1", { ascending: true }),
    supabase.from("service_types").select("id, label, is_active").eq("is_active", true).order("label", { ascending: true }),
  ]);

  throwDbError(leadsResult.error, "Failed to load leads");
  throwDbError(clientsResult.error, "Failed to load client options");
  throwDbError(propertiesResult.error, "Failed to load property options");
  throwDbError(serviceTypesResult.error, "Failed to load service types");

  const allLeads = (leadsResult.data ?? []) as LeadRecord[];
  const leads = allLeads.filter((lead) => {
    const priority = inferPriority(lead);
    return !query.priority || query.priority === "all" || query.priority === priority;
  });
  const clients = (clientsResult.data ?? []) as ClientOption[];
  const properties = (propertiesResult.data ?? []) as PropertyOption[];
  const serviceTypes = (serviceTypesResult.data ?? []) as ServiceTypeOption[];

  const leadIds = leads.map((lead) => lead.id);
  const convertedPropertyIds = leads.map((lead) => lead.converted_property_id).filter(Boolean) as string[];
  const convertedClientIds = leads.map((lead) => lead.converted_client_id).filter(Boolean) as string[];

  const [eventsResult, communicationsResult, visitsResult, invoicesResult, leadComments] = await Promise.all([
    leadIds.length
      ? supabase
          .from("events")
          .select("id, actor_user_id, entity_id, event_type, previous_state, new_state, metadata, created_at")
          .eq("entity_type", "lead")
          .in("entity_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : { data: [], error: null },
    leadIds.length
      ? supabase
          .from("communication_log")
          .select("id, lead_id, channel, message_type, recipient, subject, status, sent_at, created_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : { data: [], error: null },
    convertedPropertyIds.length
      ? supabase
          .from("service_visits")
          .select("id, property_id, scheduled_date, status, quoted_price, service_types(label)")
          .in("property_id", convertedPropertyIds)
          .order("scheduled_date", { ascending: false })
          .limit(100)
      : { data: [], error: null },
    convertedPropertyIds.length || convertedClientIds.length
      ? supabase
          .from("invoices")
          .select("id, invoice_number, client_id, property_id, amount_due, status, due_date")
          .or(
            [
              convertedPropertyIds.length ? `property_id.in.(${convertedPropertyIds.join(",")})` : null,
              convertedClientIds.length ? `client_id.in.(${convertedClientIds.join(",")})` : null,
            ]
              .filter(Boolean)
              .join(","),
          )
          .order("due_date", { ascending: false })
          .limit(100)
      : { data: [], error: null },
    leadIds.length ? listCommentsForEntities("lead", leadIds) : Promise.resolve([]),
  ]);

  throwDbError(eventsResult.error, "Failed to load lead activity");
  throwDbError(communicationsResult.error, "Failed to load lead communications");
  throwDbError(visitsResult.error, "Failed to load related visits");
  throwDbError(invoicesResult.error, "Failed to load related invoices");

  const events = (eventsResult.data ?? []) as TimelineEvent[];
  const communications = (communicationsResult.data ?? []) as CommunicationEntry[];
  const visits = (visitsResult.data ?? []) as VisitEntry[];
  const invoices = (invoicesResult.data ?? []) as InvoiceEntry[];
  const actorUserIds = Array.from(new Set(events.map((event) => event.actor_user_id).filter(Boolean))) as string[];
  const profilesResult = actorUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", actorUserIds)
    : { data: [], error: null };
  throwDbError(profilesResult.error, "Failed to load timeline users");
  const actorNames = new Map(
    ((profilesResult.data ?? []) as ProfileRecord[]).map((profile) => [
      profile.id,
      profile.display_name || profile.email || "Team member",
    ]),
  );

  const withPhotoUrls = await Promise.all(
    leads.map(async (lead) => {
      const photos = lead.lead_photos ?? [];
      const signed = await Promise.all(
        photos.map(async (photo) => {
          const signedResult = await supabase.storage.from(leadPhotoBucket).createSignedUrl(photo.storage_path, 60 * 60);
          return {
            ...photo,
            signedUrl: signedResult.data?.signedUrl ?? null,
          };
        }),
      );
      return {
        ...lead,
        status: normalizeStage(lead.status),
        lead_photos: signed,
      };
    }),
  );

  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const propertiesById = new Map(properties.map((property) => [property.id, property]));
  const sourceOptions = Array.from(new Set(allLeads.map((lead) => lead.source))).sort();
  const grouped = leadStages.map((stage) => ({
    stage,
    leads: withPhotoUrls.filter((lead) => lead.status === stage),
  }));

  const counts = Object.fromEntries(leadStages.map((stage) => [stage, withPhotoUrls.filter((lead) => lead.status === stage).length]));
  const wonCount = counts.won ?? 0;
  const lostCount = counts.lost ?? 0;
  const conversionDenominator = withPhotoUrls.length || 1;
  const averageLeadAge =
    withPhotoUrls.reduce((sum, lead) => sum + (daysSince(lead.created_at) ?? 0), 0) / conversionDenominator;
  const budgetCaptured = withPhotoUrls.filter((lead) => Boolean(lead.budget_range)).length;
  const message = systemMessage(query.status, query.message);

  return (
    <div className="space-y-5">
      <PageHeader title="Lead Command Center" description="Manage inbound landscaping leads from first inquiry through won or lost conversion." />

      {message ? (
        <div className={`rounded-xl border px-3 py-2 text-sm ${message.tone}`}>
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["New", counts.new ?? 0],
          ["Contacted", counts.contacted ?? 0],
          ["Qualified", counts.qualified ?? 0],
          ["Visits", counts.site_visit_scheduled ?? 0],
          ["Estimates", counts.estimate_sent ?? 0],
          ["Won", wonCount],
          ["Lost", lostCount],
          ["Win Rate", `${Math.round((wonCount / conversionDenominator) * 100)}%`],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-lg bg-white">
            <CardContent className="mt-0 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-1 text-xl font-semibold text-zinc-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 rounded-xl border border-[#a7b8a6] bg-[#f6f8f4] p-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <form id="lead-filters" className="contents">
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Search name, phone, property, source"
            className="min-h-11 rounded-lg border border-[#a7b8a6] bg-white px-3 text-sm"
          />
          <select name="stage" defaultValue={query.stage ?? "all"} className="min-h-11 rounded-lg border border-[#a7b8a6] bg-white px-3 text-sm">
            <option value="all">All stages</option>
            {leadStages.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={query.source ?? ""} className="min-h-11 rounded-lg border border-[#a7b8a6] bg-white px-3 text-sm">
            <option value="">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={query.priority ?? "all"} className="min-h-11 rounded-lg border border-[#a7b8a6] bg-white px-3 text-sm">
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
          <Button type="submit" className="rounded-lg">Filter</Button>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[#a7b8a6] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Average Lead Age</p>
          <p className="mt-1 text-lg font-semibold text-zinc-950">{Math.round(averageLeadAge)} days</p>
        </div>
        <div className="rounded-xl border border-[#a7b8a6] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Pipeline Value</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">{budgetCaptured} leads include budget ranges</p>
        </div>
        <div className="rounded-xl border border-[#a7b8a6] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Estimate Model</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">Invoices exist; estimate schema is not present yet.</p>
        </div>
      </section>

      {withPhotoUrls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#a7b8a6] bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-950">No leads match these filters</h2>
          <p className="mt-1 text-sm text-zinc-600">Clear filters or wait for the next phone, website, referral, or field lead to arrive.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {grouped.map(({ stage, leads: stageLeads }) => (
            <LeadDropColumn
              key={stage}
              stage={stage}
              className="min-w-0 rounded-xl border border-[#a7b8a6] bg-[#f6f8f4] p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-950">{stageLabels[stage]}</h2>
                <Badge className="border-[#a7b8a6] bg-white text-zinc-700">{stageLeads.length}</Badge>
              </div>

              <div className="space-y-3">
                {stageLeads.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#b8c6b6] bg-white px-3 py-6 text-center text-xs text-zinc-500">
                    No leads in this stage.
                  </p>
                ) : (
                  stageLeads.map((lead) => {
                    const priority = inferPriority(lead);
                    const contactPrefs = Array.isArray(lead.lead_contact_preferences)
                      ? lead.lead_contact_preferences[0]
                      : lead.lead_contact_preferences;
                    const leadEvents = events.filter((entry) => entry.entity_id === lead.id);
                    const leadComms = communications.filter((entry) => entry.lead_id === lead.id);
                    const leadCommentItems = leadComments.filter((comment) => comment.entity_id === lead.id);
                    const leadVisits = visits.filter((visit) => visit.property_id === lead.converted_property_id);
                    const leadInvoices = invoices.filter(
                      (invoice) =>
                        invoice.property_id === lead.converted_property_id ||
                        invoice.client_id === lead.converted_client_id,
                    );
                    const linkedClient = lead.converted_client_id ? clientsById.get(lead.converted_client_id) : null;
                    const linkedProperty = lead.converted_property_id ? propertiesById.get(lead.converted_property_id) : null;
                    const parsedAddress = parseAddress(lead.property_address);
                    const activity = timelineForLead({ lead, events: leadEvents, communications: leadComms, actorNames });
                    const returnParams = new URLSearchParams();
                    if (query.q) returnParams.set("q", query.q);
                    if (query.source) returnParams.set("source", query.source);
                    if (query.stage) returnParams.set("stage", query.stage);
                    if (query.priority) returnParams.set("priority", query.priority);
                    returnParams.set("lead", lead.id);
                    const leadReturnPath = `/leads?${returnParams.toString()}`;

                    return (
                      <details
                        key={lead.id}
                        open={query.lead === lead.id}
                        className="rounded-lg border border-[#a7b8a6] bg-white p-3 shadow-[0_12px_26px_-24px_rgba(23,41,29,0.42)]"
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-zinc-950">{lead.name}</h3>
                                <p className="mt-1 truncate text-xs text-zinc-600">{lead.property_address}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Badge
                                  className={
                                    priority === "urgent"
                                      ? "border-red-200 bg-red-50 text-red-800"
                                      : priority === "high"
                                        ? "border-amber-200 bg-amber-50 text-amber-900"
                                        : "border-[#a7b8a6] bg-[#f6f8f4] text-zinc-700"
                                  }
                                >
                                  {priority}
                                </Badge>
                                <LeadDragHandle leadId={lead.id} stage={lead.status} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
                              <span>Age: {leadAgeLabel(lead.created_at)}</span>
                              <span>{activityLabel(lead.last_activity_at ?? lead.updated_at)}</span>
                              <span className="truncate">{lead.source}</span>
                              <span className="truncate">{lead.phone}</span>
                            </div>
                            <p className="rounded-md bg-[#f6f8f4] px-2 py-1.5 text-xs font-medium text-zinc-800">
                              Next: {nextBestAction(lead)}
                            </p>
                          </div>
                        </summary>

                        <div className="mt-4 border-t border-[#d4ddd2] pt-4 text-sm">
                          <section className="space-y-3">
                            <div className="grid gap-2 text-[13px]">
                              {[
                                ["Contact", [lead.phone, lead.email ?? "No email"].filter(Boolean).join(" · ")],
                                ["Preferred", `${lead.preferred_contact_method}${contactPrefs?.sms_opt_in ? " · SMS opt-in" : ""}`],
                                ["Property", lead.property_address],
                                ["Services", lead.services_requested.length ? lead.services_requested.join(", ") : "None listed"],
                                ["Timeline", lead.timeline],
                                ["Budget", lead.budget_range],
                                ["Client", linkedClient ? linkedClient.full_name : "Not linked"],
                                ["Property record", linkedProperty ? formatAddress(linkedProperty) : "Not linked"],
                              ].map(([label, value]) => (
                                <div key={label} className="grid gap-0.5 border-b border-[#edf1eb] pb-2 last:border-0 last:pb-0">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</span>
                                  <span className="break-words text-zinc-900">{value}</span>
                                </div>
                              ))}
                            </div>
                            <p className="break-words text-[13px] leading-5 text-zinc-700">{lead.project_description}</p>
                            {lead.lost_reason ? (
                              <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-900">
                                Lost reason: {lead.lost_reason}
                              </p>
                            ) : null}
                          </section>

                          <form action={updateLeadStageAction.bind(null, lead.id)} className="mt-4 border-t border-[#d4ddd2] pt-4">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500" htmlFor={`stage-${lead.id}`}>Stage</label>
                            <div className="mt-2 grid gap-2">
                              <select id={`stage-${lead.id}`} name="stage" defaultValue={lead.status} className="min-h-10 min-w-0 rounded-md border border-[#a7b8a6] bg-white px-3 text-sm">
                                {leadStages.map((nextStage) => (
                                  <option key={nextStage} value={nextStage}>{stageLabels[nextStage]}</option>
                                ))}
                              </select>
                              <Button type="submit" className="min-h-10 w-full rounded-md px-3 py-2">Update stage</Button>
                            </div>
                          </form>

                          <details className="group mt-4 border-t border-[#d4ddd2] pt-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                              Activity
                              <span className="text-[11px] normal-case tracking-normal text-zinc-500 group-open:hidden">Open</span>
                              <span className="hidden text-[11px] normal-case tracking-normal text-zinc-500 group-open:inline">Close</span>
                            </summary>
                            <div className="mt-3 space-y-4">
                              <form action={addLeadInternalNoteAction.bind(null, lead.id)} className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-600" htmlFor={`note-${lead.id}`}>Internal note</label>
                                <textarea id={`note-${lead.id}`} name="note" rows={3} required className="w-full rounded-md border border-[#a7b8a6] bg-white px-3 py-2 text-sm" />
                                <Button type="submit" data-variant="secondary" className="min-h-10 w-full rounded-md px-3 py-2">Add note</Button>
                              </form>

                              <form action={logLeadCommunicationAction.bind(null, lead.id)} className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-600" htmlFor={`comm-${lead.id}`}>Log communication</label>
                                <select id={`comm-${lead.id}`} name="channel" defaultValue="call" className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm">
                                  <option value="call">Call</option>
                                  <option value="text">Text</option>
                                  <option value="email">Email</option>
                                  <option value="in_person">In person</option>
                                  <option value="other">Other</option>
                                </select>
                                <input name="recipient" defaultValue={lead.phone || lead.email || ""} required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="subject" placeholder="Subject" className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <textarea name="note" rows={2} placeholder="Outcome or next step" className="w-full rounded-md border border-[#a7b8a6] bg-white px-3 py-2 text-sm" />
                                <Button type="submit" data-variant="secondary" className="min-h-10 w-full rounded-md px-3 py-2">Log communication</Button>
                              </form>
                            </div>
                          </details>

                          <details className="group mt-4 border-t border-[#d4ddd2] pt-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                              Site Visit
                              <span className="text-[11px] normal-case tracking-normal text-zinc-500 group-open:hidden">Open</span>
                              <span className="hidden text-[11px] normal-case tracking-normal text-zinc-500 group-open:inline">Close</span>
                            </summary>
                            <form action={scheduleLeadSiteVisitAction.bind(null, lead.id)} className="mt-3 space-y-2">
                              <input id={`visit-${lead.id}`} name="scheduledDate" type="date" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                              <select name="serviceTypeId" defaultValue="" className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm">
                                <option value="">Log only</option>
                                {serviceTypes.map((serviceType) => (
                                  <option key={serviceType.id} value={serviceType.id}>{serviceType.label}</option>
                                ))}
                              </select>
                              <input name="quotedPrice" type="number" min="0" step="1" placeholder="Quoted price" className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                              <textarea name="notes" rows={2} placeholder="Visit notes" className="w-full rounded-md border border-[#a7b8a6] bg-white px-3 py-2 text-sm" />
                              <Button type="submit" className="min-h-10 w-full rounded-md px-3 py-2">Schedule visit</Button>
                            </form>
                          </details>

                          <details className="group mt-4 border-t border-[#d4ddd2] pt-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                              Conversion
                              <span className="text-[11px] normal-case tracking-normal text-zinc-500 group-open:hidden">Open</span>
                              <span className="hidden text-[11px] normal-case tracking-normal text-zinc-500 group-open:inline">Close</span>
                            </summary>
                            <div className="mt-3 space-y-4">
                              <form action={linkLeadClientAction.bind(null, lead.id)} className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-600" htmlFor={`client-${lead.id}`}>Link existing client</label>
                                <select id={`client-${lead.id}`} name="clientId" defaultValue={lead.converted_client_id ?? ""} className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm">
                                  <option value="">Select client</option>
                                  {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.full_name}</option>
                                  ))}
                                </select>
                                <Button type="submit" data-variant="secondary" className="min-h-10 w-full rounded-md px-3 py-2">Link client</Button>
                              </form>

                              <form action={linkLeadPropertyAction.bind(null, lead.id)} className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-600" htmlFor={`property-${lead.id}`}>Link existing property</label>
                                <select id={`property-${lead.id}`} name="propertyId" defaultValue={lead.converted_property_id ?? ""} className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm">
                                  <option value="">Select property</option>
                                  {properties.map((property) => (
                                    <option key={property.id} value={property.id}>{formatAddress(property)}</option>
                                  ))}
                                </select>
                                <Button type="submit" data-variant="secondary" className="min-h-10 w-full rounded-md px-3 py-2">Link property</Button>
                              </form>

                              <form action={convertLeadAction.bind(null, lead.id)} className="space-y-2 border-t border-[#edf1eb] pt-4">
                                <input type="hidden" name="clientId" value={lead.converted_client_id ?? ""} />
                                <input type="hidden" name="propertyId" value={lead.converted_property_id ?? ""} />
                                <input name="fullName" defaultValue={linkedClient?.full_name ?? lead.name} placeholder="Client name" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="phone" defaultValue={linkedClient?.primary_phone ?? lead.phone} placeholder="Phone" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="email" defaultValue={linkedClient?.primary_email ?? lead.email ?? ""} placeholder="Email" className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="propertyName" defaultValue={linkedProperty?.property_name ?? ""} placeholder="Property name" className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="street1" defaultValue={linkedProperty?.street_1 ?? parsedAddress.street1} placeholder="Street" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="street2" defaultValue={linkedProperty?.street_2 ?? ""} placeholder="Street 2" className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="city" defaultValue={linkedProperty?.city ?? parsedAddress.city} placeholder="City" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="state" defaultValue={linkedProperty?.state ?? parsedAddress.state} placeholder="State" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <input name="postalCode" defaultValue={linkedProperty?.postal_code ?? parsedAddress.postalCode} placeholder="Postal code" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <textarea name="serviceNotes" rows={2} defaultValue={lead.project_description} placeholder="Service notes" className="w-full rounded-md border border-[#a7b8a6] bg-white px-3 py-2 text-sm" />
                                <textarea name="accessNotes" rows={2} placeholder="Access notes" className="w-full rounded-md border border-[#a7b8a6] bg-white px-3 py-2 text-sm" />
                                <Button type="submit" className="min-h-10 w-full rounded-md px-3 py-2">Mark won and convert</Button>
                              </form>

                              <form action={markLeadLostAction.bind(null, lead.id)} className="space-y-2 border-t border-[#edf1eb] pt-4">
                                <input name="reason" placeholder="Lost reason" required className="min-h-10 w-full rounded-md border border-[#a7b8a6] bg-white px-3 text-sm" />
                                <Button type="submit" data-variant="warning" className="min-h-10 w-full rounded-md px-3 py-2">Mark lost</Button>
                              </form>
                            </div>
                          </details>

                          <details className="group mt-4 border-t border-[#d4ddd2] pt-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                              Records
                              <span className="text-[11px] normal-case tracking-normal text-zinc-500 group-open:hidden">
                                {leadVisits.length} visits · {leadInvoices.length} invoices
                              </span>
                              <span className="hidden text-[11px] normal-case tracking-normal text-zinc-500 group-open:inline">Close</span>
                            </summary>
                            <div className="mt-3 space-y-3">
                              {lead.converted_client_id && lead.converted_property_id ? (
                                <Link
                                  href={`/invoices/new?clientId=${lead.converted_client_id}&propertyId=${lead.converted_property_id}`}
                                  className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-[#92a891] bg-white px-3 text-xs font-semibold text-zinc-900"
                                >
                                  Create invoice draft
                                </Link>
                              ) : (
                                <p className="text-xs text-zinc-600">Convert or link client/property before creating invoice drafts.</p>
                              )}
                              <p className="text-xs text-zinc-500">Estimate draft action needs an estimate table or invoice type distinction.</p>

                              <div className="space-y-2">
                                {leadVisits.slice(0, 4).map((visit) => (
                                  <Link key={visit.id} href={`/service-visits/${visit.id}`} className="block border-t border-[#edf1eb] pt-2 text-xs text-zinc-700">
                                    <span className="font-semibold text-zinc-900">{formatDate(visit.scheduled_date)}</span> · {visit.status} · {relationName(visit.service_types)}
                                  </Link>
                                ))}
                                {leadInvoices.slice(0, 4).map((invoice) => (
                                  <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block border-t border-[#edf1eb] pt-2 text-xs text-zinc-700">
                                    <span className="font-semibold text-zinc-900">{invoice.invoice_number}</span> · {invoice.status} · {formatCurrencyFromCents(invoice.amount_due)}
                                  </Link>
                                ))}
                                {!leadVisits.length && !leadInvoices.length ? <p className="text-xs text-zinc-500">No related records yet.</p> : null}
                              </div>
                            </div>
                          </details>

                          <details className="group mt-4 border-t border-[#d4ddd2] pt-3">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                              Activity & Notes
                              <span className="text-[11px] normal-case tracking-normal text-zinc-500 group-open:hidden">
                                {activity.length + leadCommentItems.length} entries
                              </span>
                              <span className="hidden text-[11px] normal-case tracking-normal text-zinc-500 group-open:inline">Close</span>
                            </summary>
                            <div className="mt-3">
                              <ActivityNotes
                                entityType="lead"
                                entityId={lead.id}
                                returnPath={leadReturnPath}
                                comments={leadCommentItems}
                                events={leadEvents.map((entry) => ({
                                  id: entry.id,
                                  event_type: entry.event_type,
                                  metadata: entry.metadata,
                                  created_at: entry.created_at,
                                  actor_name: entry.actor_user_id ? actorNames.get(entry.actor_user_id) ?? "Team member" : "System",
                                }))}
                                currentUserId={auth.userId}
                                placeholder="Example: Qualified for mulch, needs estimate follow-up, prefers text after 5 PM"
                                emptyMessage="No lead activity or notes yet."
                              />
                            </div>
                          </details>

                          {(lead.lead_photos ?? []).length ? (
                            <details className="group mt-4 border-t border-[#d4ddd2] pt-3">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                                Photos
                                <span className="text-[11px] normal-case tracking-normal text-zinc-500 group-open:hidden">{lead.lead_photos?.length ?? 0}</span>
                                <span className="hidden text-[11px] normal-case tracking-normal text-zinc-500 group-open:inline">Close</span>
                              </summary>
                              <div className="mt-3 grid gap-2">
                                {(lead.lead_photos ?? []).map((photo) => (
                                  <figure key={photo.id} className="text-xs">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo.signedUrl ?? ""} alt={photo.caption ?? "Lead photo"} className="h-36 w-full rounded-md object-cover" />
                                    <figcaption className="mt-1 text-[11px] text-zinc-600">
                                      {photo.caption ?? "No caption"} · {formatDateTime(photo.created_at)}
                                    </figcaption>
                                  </figure>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </LeadDropColumn>
          ))}
        </div>
      )}
    </div>
  );
}
