import { faker } from "@faker-js/faker";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type SeedClient = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  paymentPreference: "venmo" | "cash" | "check" | "other";
  billingNotes: string;
  venmoHandle: string | null;
  checkPayableTo: string | null;
  cashCollectionNotes: string | null;
  checkDropLocationNotes: string | null;
  isActive: boolean;
};

type SeedProperty = {
  id: string;
  clientId: string;
  street1: string;
  city: string;
  state: string;
  postalCode: string;
  propertyName: string | null;
  accessNotes: string | null;
  gateNotes: string | null;
  serviceNotes: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
};

type SeedPlan = {
  id: string;
  propertyId: string;
  serviceTypeId: string;
  planName: string;
  frequencyType: "weekly" | "biweekly" | "custom_interval" | "seasonal" | "one_time";
  dayOfWeek: number | null;
  intervalCount: number | null;
  startDate: string;
  endDate: string | null;
  quotedPrice: number;
  status: "active" | "paused" | "inactive";
  preferredServiceWindow: string | null;
  notes: string | null;
  seasonStartMonth: number | null;
  seasonEndMonth: number | null;
};

type SeedVisit = {
  id: string;
  propertyId: string;
  servicePlanId: string | null;
  serviceTypeId: string;
  scheduledDate: string;
  scheduledPosition: number | null;
  status: "scheduled" | "completed" | "skipped" | "rescheduled" | "pending_reactivation" | "canceled";
  quotedPrice: number;
  operatorNotes: string | null;
  completionNotes: string | null;
  completionTimestamp: string | null;
  skipReason: string | null;
  reactivationRequired: boolean;
  wasRainDelayed: boolean;
  rainDelaySourceDate: string | null;
  rescheduledFromVisitId: string | null;
};

type SeedInvoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  propertyId: string;
  serviceVisitId: string | null;
  amountDue: number;
  invoiceDate: string;
  dueDate: string;
  status: "sent" | "paid" | "overdue";
  paymentInstructionsSnapshot: string | null;
  venmoHandleSnapshot: string | null;
  cashCheckNotesSnapshot: string | null;
  emailSentAt: string | null;
  lastReminderSentAt: string | null;
};

type SeedPayment = {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "venmo" | "cash" | "check" | "other";
  referenceNote: string | null;
};

type SeedPhoto = {
  id: string;
  serviceVisitId: string;
  photoType: "before" | "after" | "issue";
  storagePath: string;
  caption: string | null;
  uploadedAt: string;
};

const FAKER_SEED = 24052026;

// Configurable dataset size/date bounds.
const CLIENT_COUNT = 120;
const PROPERTY_COUNT = 180;
const VISIT_COUNT = 520;
const INVOICE_COUNT = 260;
const START_DATE = "2026-04-01";
const END_DATE = "2026-06-30";

const ORG_ID = "0f0f6e4a-9ad9-438a-b064-1f42b7100001";
const SERVICE_TYPE_IDS = {
  mowing: "83da9f74-5e66-45b2-b95c-2c990fa10001",
  cleanup: "83da9f74-5e66-45b2-b95c-2c990fa10002",
  mulch: "83da9f74-5e66-45b2-b95c-2c990fa10003",
  leaf: "83da9f74-5e66-45b2-b95c-2c990fa10004",
} as const;

const PAYMENT_PREFS: SeedClient["paymentPreference"][] = ["venmo", "cash", "check", "other"];
const PLAN_FREQUENCIES: SeedPlan["frequencyType"][] = ["weekly", "biweekly", "custom_interval", "seasonal", "one_time"];
const VISIT_STATUSES: SeedVisit["status"][] = ["scheduled", "completed", "skipped", "rescheduled", "pending_reactivation", "canceled"];
const PHOTO_TYPES: SeedPhoto["photoType"][] = ["before", "after", "issue"];

faker.seed(FAKER_SEED);

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBool(value: boolean): string {
  return value ? "true" : "false";
}

function sqlNum(value: number | null): string {
  if (value === null) return "NULL";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function pick<T>(items: readonly T[]): T {
  return items[faker.number.int({ min: 0, max: items.length - 1 })] as T;
}

function randomDateBetween(fromISO: string, toISO: string): Date {
  return faker.date.between({ from: `${fromISO}T00:00:00.000Z`, to: `${toISO}T00:00:00.000Z` });
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayShift(dateISO: string, days: number): string {
  const dt = new Date(`${dateISO}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISODate(dt);
}

function money(min = 35, max = 240): number {
  return Number(faker.finance.amount({ min, max, dec: 2 }));
}

function buildClients(): SeedClient[] {
  return Array.from({ length: CLIENT_COUNT }, (_, idx) => {
    const paymentPreference = PAYMENT_PREFS[idx % PAYMENT_PREFS.length]!;
    const name = faker.person.fullName();
    return {
      id: faker.string.uuid(),
      fullName: name,
      email: faker.internet.email({ firstName: name.split(" ")[0], provider: "example.local" }).toLowerCase(),
      phone: faker.helpers.fromRegExp("609-[2-9][0-9]{2}-[0-9]{4}"),
      paymentPreference,
      billingNotes: `Seeded local demo account (${idx + 1}).`,
      venmoHandle: paymentPreference === "venmo" ? `@${faker.internet.username().toLowerCase().slice(0, 12)}` : null,
      checkPayableTo: paymentPreference === "check" ? "Loam Landscaping LLC" : null,
      cashCollectionNotes: paymentPreference === "cash" ? pick(["Mailbox envelope", "Side porch lockbox", "Leave with homeowner"]) : null,
      checkDropLocationNotes: paymentPreference === "check" ? pick(["Front door mail slot", "Garage side mailbox", "Office pickup Fridays"]) : null,
      isActive: faker.datatype.boolean({ probability: 0.92 }),
    };
  });
}

function buildProperties(clients: SeedClient[]): SeedProperty[] {
  return Array.from({ length: PROPERTY_COUNT }, (_, idx) => {
    const client = clients[idx % clients.length]!;
    const state = pick(["NJ", "PA", "DE"] as const);
    const withCoords = faker.datatype.boolean({ probability: 0.94 });
    const hasAccess = faker.datatype.boolean({ probability: 0.33 });
    return {
      id: faker.string.uuid(),
      clientId: client.id,
      street1: faker.location.streetAddress(),
      city: faker.location.city(),
      state,
      postalCode: faker.location.zipCode("#####"),
      propertyName: faker.datatype.boolean({ probability: 0.2 }) ? `${client.fullName.split(" ")[0]} Residence` : null,
      accessNotes: hasAccess ? pick(["Dog in backyard, latch gate securely.", "Use side gate near AC unit.", "Avoid flower bed edging by mailbox.", "Call on arrival for gate unlock."]) : null,
      gateNotes: faker.datatype.boolean({ probability: 0.18 }) ? `Gate code #${faker.string.numeric(4)}` : null,
      serviceNotes: pick(["Blow clippings off driveway.", "Bag clippings this visit.", "Edge curb and sidewalk.", "Watch sprinkler heads near curb."]),
      latitude: withCoords ? Number(faker.location.latitude({ min: 39.45, max: 40.2, precision: 6 })) : null,
      longitude: withCoords ? Number(faker.location.longitude({ min: -75.45, max: -74.7, precision: 6 })) : null,
      isActive: faker.datatype.boolean({ probability: 0.95 }),
    };
  });
}

function buildPlans(properties: SeedProperty[]): SeedPlan[] {
  return properties.map((property, idx) => {
    const frequencyType = PLAN_FREQUENCIES[idx % PLAN_FREQUENCIES.length]!;
    const status: SeedPlan["status"] = idx % 13 === 0 ? "paused" : idx % 21 === 0 ? "inactive" : "active";
    const startDate = dayShift(START_DATE, faker.number.int({ min: -45, max: 5 }));
    const oneTimeDate = dayShift(START_DATE, faker.number.int({ min: 0, max: 70 }));
    return {
      id: faker.string.uuid(),
      propertyId: property.id,
      serviceTypeId: Object.values(SERVICE_TYPE_IDS)[idx % Object.values(SERVICE_TYPE_IDS).length]!,
      planName: `${pick(["Weekly Cut", "Cleanup", "Seasonal Care", "Yard Care", "Standard Service"])} ${idx + 1}`,
      frequencyType,
      dayOfWeek: frequencyType === "weekly" || frequencyType === "biweekly" || frequencyType === "seasonal" ? faker.number.int({ min: 1, max: 5 }) : null,
      intervalCount: frequencyType === "custom_interval" ? pick([14, 21, 28]) : null,
      startDate: frequencyType === "one_time" ? oneTimeDate : startDate,
      endDate: frequencyType === "one_time" ? oneTimeDate : null,
      quotedPrice: money(45, 190),
      status,
      preferredServiceWindow: pick(["Morning", "Late Morning", "Afternoon", "Anytime"]),
      notes: faker.datatype.boolean({ probability: 0.22 }) ? "Auto-seeded plan for local runbook QA." : null,
      seasonStartMonth: frequencyType === "seasonal" ? 3 : null,
      seasonEndMonth: frequencyType === "seasonal" ? 11 : null,
    };
  });
}

function buildVisits(properties: SeedProperty[], plans: SeedPlan[]): SeedVisit[] {
  const planByProperty = new Map(plans.map((plan) => [plan.propertyId, plan]));
  const highDensityDate = dayShift(START_DATE, 42);
  const tomorrowDate = dayShift(toISODate(new Date()), 1);

  return Array.from({ length: VISIT_COUNT }, (_, idx) => {
    const property = properties[idx % properties.length]!;
    const plan = planByProperty.get(property.id) ?? null;
    const rawDate = randomDateBetween(START_DATE, END_DATE);
    const scheduledDate = idx < 40 ? highDensityDate : idx >= 40 && idx < 70 ? tomorrowDate : toISODate(rawDate);

    let status = pick(VISIT_STATUSES);
    if (idx < 120) status = "completed";
    if (idx >= 120 && idx < 165) status = "skipped";
    if (idx >= 165 && idx < 190) status = "rescheduled";
    if (idx >= 190 && idx < 210) status = "pending_reactivation";

    const isCompleted = status === "completed";
    const isSkipped = status === "skipped";
    const isRescheduled = status === "rescheduled";
    const isPending = status === "pending_reactivation";

    const completionTimestamp = isCompleted
      ? `${scheduledDate}T${String(faker.number.int({ min: 13, max: 21 })).padStart(2, "0")}:${String(faker.number.int({ min: 0, max: 59 })).padStart(2, "0")}:00.000Z`
      : null;

    const wasRainDelayed = faker.datatype.boolean({ probability: 0.08 });

    return {
      id: faker.string.uuid(),
      propertyId: property.id,
      servicePlanId: plan?.id ?? null,
      serviceTypeId: plan?.serviceTypeId ?? SERVICE_TYPE_IDS.mowing,
      scheduledDate,
      scheduledPosition: idx < 80 ? (idx % 24) + 1 : faker.datatype.boolean({ probability: 0.7 }) ? faker.number.int({ min: 1, max: 120 }) : null,
      status,
      quotedPrice: plan?.quotedPrice ?? money(55, 220),
      operatorNotes: isRescheduled
        ? pick(["Rescheduled due to crew capacity.", "Rescheduled due to weather forecast.", "Client requested next available day."])
        : isSkipped || isPending
          ? pick(["Gate locked on arrival.", "Client requested skip for event.", "Standing water after rain."])
          : faker.datatype.boolean({ probability: 0.15 })
            ? "Leave bagged clippings near garage."
            : null,
      completionNotes: isCompleted ? pick(["Completed and cleaned hardscape edges.", "Completed; client requested extra trim by fence.", "Completed without issues."]) : null,
      completionTimestamp,
      skipReason: isSkipped || isPending ? pick(["access issue", "rain/weather", "customer canceled", "equipment issue", "other"]) : null,
      reactivationRequired: isSkipped || isPending,
      wasRainDelayed,
      rainDelaySourceDate: wasRainDelayed ? dayShift(scheduledDate, -1) : null,
      rescheduledFromVisitId: null,
    };
  }).map((visit, idx, arr) => {
    if (visit.status === "rescheduled" && idx > 0) {
      const prior = arr[Math.max(0, idx - 1)]!;
      return { ...visit, rescheduledFromVisitId: prior.id };
    }
    return visit;
  });
}

function buildInvoices(visits: SeedVisit[], properties: SeedProperty[]): SeedInvoice[] {
  const propertyToClient = new Map(properties.map((property) => [property.id, property.clientId]));
  const completedVisits = visits.filter((visit) => visit.status === "completed");

  return Array.from({ length: Math.min(INVOICE_COUNT, completedVisits.length) }, (_, idx) => {
    const visit = completedVisits[idx]!;
    const invoiceDate = dayShift(visit.scheduledDate, faker.number.int({ min: 0, max: 3 }));
    const dueDate = dayShift(invoiceDate, faker.number.int({ min: 14, max: 45 }));
    const status: SeedInvoice["status"] = idx % 6 === 0 ? "overdue" : idx % 3 === 0 ? "paid" : "sent";

    return {
      id: faker.string.uuid(),
      invoiceNumber: `INV-${new Date().getUTCFullYear()}-${String(idx + 1).padStart(5, "0")}`,
      clientId: propertyToClient.get(visit.propertyId) ?? properties[0]!.clientId,
      propertyId: visit.propertyId,
      serviceVisitId: visit.id,
      amountDue: visit.quotedPrice,
      invoiceDate,
      dueDate,
      status,
      paymentInstructionsSnapshot: pick(["Pay via Venmo, check, or cash.", "Payment due in 30 days.", "Online payment link available on request."]),
      venmoHandleSnapshot: faker.datatype.boolean({ probability: 0.45 }) ? "@loam-landscaping" : null,
      cashCheckNotesSnapshot: faker.datatype.boolean({ probability: 0.4 }) ? "Checks payable to Loam Landscaping LLC." : null,
      emailSentAt: faker.datatype.boolean({ probability: 0.8 }) ? `${invoiceDate}T13:00:00.000Z` : null,
      lastReminderSentAt: status === "overdue" ? `${dayShift(dueDate, 7)}T15:00:00.000Z` : null,
    };
  });
}

function buildPayments(invoices: SeedInvoice[]): SeedPayment[] {
  const rows: SeedPayment[] = [];

  for (const invoice of invoices) {
    if (invoice.status === "paid") {
      rows.push({
        id: faker.string.uuid(),
        invoiceId: invoice.id,
        amount: invoice.amountDue,
        paymentDate: dayShift(invoice.invoiceDate, faker.number.int({ min: 3, max: 18 })),
        paymentMethod: pick(["venmo", "cash", "check", "other"] as const),
        referenceNote: "Auto-seeded full payment.",
      });
      continue;
    }

    if (invoice.status === "overdue") {
      if (faker.datatype.boolean({ probability: 0.35 })) {
        rows.push({
          id: faker.string.uuid(),
          invoiceId: invoice.id,
          amount: Number((invoice.amountDue * 0.4).toFixed(2)),
          paymentDate: dayShift(invoice.invoiceDate, faker.number.int({ min: 5, max: 25 })),
          paymentMethod: pick(["venmo", "cash", "check", "other"] as const),
          referenceNote: "Auto-seeded partial payment.",
        });
      }
    }
  }

  return rows;
}

function buildPhotos(visits: SeedVisit[]): SeedPhoto[] {
  const completed = visits.filter((visit) => visit.status === "completed");
  const rows: SeedPhoto[] = [];

  for (let i = 0; i < completed.length; i += 1) {
    const visit = completed[i]!;
    if (!faker.datatype.boolean({ probability: 0.55 })) continue;

    const photoCount = pick([1, 2, 3] as const);
    for (let n = 0; n < photoCount; n += 1) {
      rows.push({
        id: faker.string.uuid(),
        serviceVisitId: visit.id,
        photoType: PHOTO_TYPES[(n + i) % PHOTO_TYPES.length]!,
        storagePath: `seed/${visit.id}/${n + 1}.jpg`,
        caption: pick(["Before service", "After service", "Issue documented", "Completed edge trim"]),
        uploadedAt: visit.completionTimestamp ?? `${visit.scheduledDate}T18:00:00.000Z`,
      });
    }
  }

  return rows;
}

function buildCommunicationRows(visits: SeedVisit[], invoices: SeedInvoice[], properties: SeedProperty[]): string[] {
  const propertyToClient = new Map(properties.map((property) => [property.id, property.clientId]));
  const rows: string[] = [];

  for (const invoice of invoices) {
    rows.push(`(${sqlString("email")}, ${sqlString("invoice_request")}, ${sqlString("seed-recipient@example.local")}, ${sqlString("sent")}, ${sqlString(invoice.clientId)}, ${sqlString(invoice.propertyId)}, ${sqlString(invoice.serviceVisitId)}, ${sqlString(invoice.id)}, ${sqlString(`Invoice ${invoice.invoiceNumber}`)}, ${sqlString(invoice.emailSentAt ?? `${invoice.invoiceDate}T12:00:00.000Z`)})`);
  }

  // Tomorrow confirmation-style reminders.
  const tomorrow = dayShift(toISODate(new Date()), 1);
  const tomorrowVisits = visits.filter((visit) => visit.scheduledDate === tomorrow && ["scheduled", "rescheduled"].includes(visit.status));
  for (const visit of tomorrowVisits.slice(0, 100)) {
    rows.push(`(${sqlString("sms")}, ${sqlString("service_reminder")}, ${sqlString("seed-recipient@example.local")}, ${sqlString("sent")}, ${sqlString(propertyToClient.get(visit.propertyId) ?? null)}, ${sqlString(visit.propertyId)}, ${sqlString(visit.id)}, NULL, ${sqlString("Tomorrow service confirmation")}, ${sqlString(`${dayShift(tomorrow, -1)}T18:00:00.000Z`)})`);
  }

  return rows;
}

function toInsert(table: string, columns: string[], values: string[]): string {
  if (values.length === 0) return `-- No rows for ${table}`;
  return `INSERT INTO ${table} (${columns.join(", ")})\nVALUES\n${values.join(",\n")};`;
}

function main() {
  const clients = buildClients();
  const properties = buildProperties(clients);
  const plans = buildPlans(properties);
  const visits = buildVisits(properties, plans);
  const invoices = buildInvoices(visits, properties);
  const payments = buildPayments(invoices);
  const photos = buildPhotos(visits);
  const commRows = buildCommunicationRows(visits, invoices, properties);

  const clientRows = clients.map((client) => `(${sqlString(client.id)}, ${sqlString(client.fullName)}, ${sqlString(client.email)}, ${sqlString(client.phone)}, ${sqlString(client.paymentPreference)}, ${sqlString(client.billingNotes)}, ${sqlString(client.cashCollectionNotes)}, ${sqlString(client.checkDropLocationNotes)}, ${sqlString(client.checkPayableTo)}, ${sqlString(client.venmoHandle)}, ${sqlBool(client.isActive)})`);

  const propertyRows = properties.map((property) => `(${sqlString(property.id)}, ${sqlString(property.clientId)}, ${sqlString(property.street1)}, ${sqlString(property.city)}, ${sqlString(property.state)}, ${sqlString(property.postalCode)}, ${sqlString(property.propertyName)}, ${sqlString(property.serviceNotes)}, ${sqlString(property.accessNotes)}, ${sqlString(property.gateNotes)}, ${sqlNum(property.latitude)}, ${sqlNum(property.longitude)}, ${sqlBool(property.isActive)})`);

  const planRows = plans.map((plan) => `(${sqlString(plan.id)}, ${sqlString(plan.propertyId)}, ${sqlString(plan.serviceTypeId)}, ${sqlString(plan.planName)}, ${sqlString(plan.frequencyType)}, ${sqlNum(plan.dayOfWeek)}, ${sqlNum(plan.intervalCount)}, ${sqlString(plan.startDate)}, ${sqlString(plan.endDate)}, ${sqlNum(plan.quotedPrice)}, ${sqlString(plan.status)}, ${sqlString(plan.preferredServiceWindow)}, ${sqlString(plan.notes)}, ${sqlNum(plan.seasonStartMonth)}, ${sqlNum(plan.seasonEndMonth)})`);

  const visitRows = visits.map((visit) => `(${sqlString(visit.id)}, ${sqlString(visit.propertyId)}, ${sqlString(visit.servicePlanId)}, ${sqlString(visit.serviceTypeId)}, ${sqlString(visit.scheduledDate)}, ${sqlNum(visit.scheduledPosition)}, ${sqlString(visit.status)}, ${sqlNum(visit.quotedPrice)}, ${sqlString(visit.operatorNotes)}, ${sqlString(visit.completionNotes)}, ${sqlString(visit.completionTimestamp)}, ${sqlString(visit.skipReason)}, ${sqlBool(visit.reactivationRequired)}, ${sqlBool(visit.wasRainDelayed)}, ${sqlString(visit.rainDelaySourceDate)}, ${sqlString(visit.rescheduledFromVisitId)})`);

  const invoiceRows = invoices.map((invoice) => `(${sqlString(invoice.id)}, ${sqlString(invoice.invoiceNumber)}, ${sqlString(invoice.clientId)}, ${sqlString(invoice.propertyId)}, ${sqlString(invoice.serviceVisitId)}, ${sqlNum(invoice.amountDue)}, ${sqlString(invoice.invoiceDate)}, ${sqlString(invoice.dueDate)}, ${sqlString(invoice.status)}, ${sqlString(invoice.paymentInstructionsSnapshot)}, ${sqlString(invoice.venmoHandleSnapshot)}, ${sqlString(invoice.cashCheckNotesSnapshot)}, ${sqlString(invoice.emailSentAt)}, ${sqlString(invoice.lastReminderSentAt)})`);

  const paymentRows = payments.map((payment) => `(${sqlString(payment.id)}, ${sqlString(payment.invoiceId)}, ${sqlNum(payment.amount)}, ${sqlString(payment.paymentDate)}, ${sqlString(payment.paymentMethod)}, ${sqlString(payment.referenceNote)})`);

  const photoRows = photos.map((photo) => `(${sqlString(photo.id)}, ${sqlString(photo.serviceVisitId)}, ${sqlString(photo.photoType)}, ${sqlString(photo.storagePath)}, ${sqlString(photo.caption)}, ${sqlString(photo.uploadedAt)})`);

  const refreshRows = invoices.map((invoice) => `SELECT public.refresh_invoice_status(${sqlString(invoice.id)});`).join("\n");

  const sql = `-- Generated by scripts/generate-seed.ts\n-- Deterministic seed using faker seed ${FAKER_SEED}\n-- Local development/demo seed only. Do NOT run against production.\n\nBEGIN;\n\n-- ------------------------------------------------------------------------\n-- LOCAL RESET OPTION (commented out by default)\n-- Uncomment only for local development resets.\n-- TRUNCATE TABLE\n--   public.app_events,\n--   public.daily_run_state,\n--   public.communication_log,\n--   public.visit_photos,\n--   public.payments,\n--   public.invoices,\n--   public.service_visits,\n--   public.service_plans,\n--   public.properties,\n--   public.clients,\n--   public.organization_members,\n--   public.organizations,\n--   public.profiles\n-- RESTART IDENTITY CASCADE;\n-- ------------------------------------------------------------------------\n\n-- Ensure base organization exists for local multi-tenant auth testing.\nINSERT INTO public.organizations (id, name)\nVALUES (${sqlString(ORG_ID)}, ${sqlString("Loam Demo Operations")})\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n\n-- Seed profiles + memberships if local auth users are available.\nWITH users_limited AS (\n  SELECT id, email\n  FROM auth.users\n  ORDER BY created_at\n  LIMIT 3\n)\nINSERT INTO public.profiles (id, display_name, email)\nSELECT id, split_part(coalesce(email, 'Demo User'), '@', 1), email\nFROM users_limited\nON CONFLICT (id) DO NOTHING;\n\nWITH users_limited AS (\n  SELECT id\n  FROM auth.users\n  ORDER BY created_at\n  LIMIT 3\n)\nINSERT INTO public.organization_members (organization_id, user_id, role)\nSELECT ${sqlString(ORG_ID)}, id, CASE WHEN row_number() OVER () = 1 THEN 'owner' ELSE 'member' END\nFROM users_limited\nON CONFLICT (organization_id, user_id) DO NOTHING;\n\n-- Service types used by plans/visits.\nINSERT INTO public.service_types (id, code, label, is_active, is_recurring_capable, is_seasonal)\nVALUES\n  (${sqlString(SERVICE_TYPE_IDS.mowing)}, 'mowing', 'Mowing', true, true, true),\n  (${sqlString(SERVICE_TYPE_IDS.cleanup)}, 'cleanup', 'Cleanup', true, true, true),\n  (${sqlString(SERVICE_TYPE_IDS.mulch)}, 'mulch', 'Mulch Refresh', true, false, true),\n  (${sqlString(SERVICE_TYPE_IDS.leaf)}, 'leaf', 'Leaf Removal', true, true, true)\nON CONFLICT (id) DO UPDATE\nSET\n  code = EXCLUDED.code,\n  label = EXCLUDED.label,\n  is_active = EXCLUDED.is_active,\n  is_recurring_capable = EXCLUDED.is_recurring_capable,\n  is_seasonal = EXCLUDED.is_seasonal;\n\n${toInsert("public.clients", ["id", "full_name", "primary_email", "primary_phone", "payment_method_preference", "billing_notes", "cash_collection_notes", "check_drop_location_notes", "check_payable_to", "venmo_handle", "is_active"], clientRows)}\n\n${toInsert("public.properties", ["id", "client_id", "street_1", "city", "state", "postal_code", "property_name", "service_notes", "access_notes", "gate_notes", "latitude", "longitude", "is_active"], propertyRows)}\n\n${toInsert("public.service_plans", ["id", "property_id", "service_type_id", "plan_name", "frequency_type", "day_of_week", "interval_count", "start_date", "end_date", "quoted_price", "status", "preferred_service_window", "notes", "season_start_month", "season_end_month"], planRows)}\n\n${toInsert("public.service_visits", ["id", "property_id", "service_plan_id", "service_type_id", "scheduled_date", "scheduled_position", "status", "quoted_price", "operator_notes", "completion_notes", "completion_timestamp", "skip_reason", "reactivation_required", "was_rain_delayed", "rain_delay_source_date", "rescheduled_from_visit_id"], visitRows)}\n\n${toInsert("public.invoices", ["id", "invoice_number", "client_id", "property_id", "service_visit_id", "amount_due", "invoice_date", "due_date", "status", "payment_instructions_snapshot", "venmo_handle_snapshot", "cash_check_notes_snapshot", "email_sent_at", "last_reminder_sent_at"], invoiceRows)}\n\n${toInsert("public.payments", ["id", "invoice_id", "amount", "payment_date", "payment_method", "reference_note"], paymentRows)}\n\n${toInsert("public.visit_photos", ["id", "service_visit_id", "photo_type", "storage_path", "caption", "uploaded_at"], photoRows)}\n\n${toInsert("public.communication_log", ["channel", "message_type", "recipient", "status", "client_id", "property_id", "service_visit_id", "invoice_id", "subject", "sent_at"], commRows)}\n\n-- Recompute invoice statuses based on due date/payments for realism (overdue vs paid vs sent).\n${refreshRows}\n\n-- Optional newer tables: app_events + daily_run_state (if present in your local schema).\nDO $$\nDECLARE\n  v_actor uuid;\nBEGIN\n  SELECT id INTO v_actor FROM auth.users ORDER BY created_at LIMIT 1;\n\n  IF v_actor IS NOT NULL AND to_regclass('public.daily_run_state') IS NOT NULL THEN\n    INSERT INTO public.daily_run_state (organization_id, user_id, run_date, phase, active_visit_id, confirmed_today, metadata)\n    SELECT\n      ${sqlString(ORG_ID)},\n      v_actor,\n      current_date,\n      'running',\n      (SELECT id FROM public.service_visits WHERE status IN ('scheduled', 'rescheduled') ORDER BY scheduled_date LIMIT 1),\n      true,\n      jsonb_build_object('seed', true, 'source', 'generate-seed.ts')\n    ON CONFLICT (organization_id, user_id, run_date)\n    DO UPDATE SET phase = EXCLUDED.phase, active_visit_id = EXCLUDED.active_visit_id, confirmed_today = EXCLUDED.confirmed_today, metadata = EXCLUDED.metadata, updated_at = now();\n  END IF;\n\n  IF to_regclass('public.app_events') IS NOT NULL THEN\n    INSERT INTO public.app_events (tenant_id, actor_id, entity_type, entity_id, event_type, payload, metadata, source)\n    SELECT\n      ${sqlString(ORG_ID)},\n      v_actor,\n      'service_visit',\n      sv.id,\n      CASE\n        WHEN sv.status = 'completed' THEN 'visit_completed'\n        WHEN sv.status = 'skipped' THEN 'visit_skipped'\n        WHEN sv.status = 'rescheduled' THEN 'visit_rescheduled'\n        ELSE 'visit_scheduled'\n      END,\n      jsonb_build_object('seed', true),\n      jsonb_build_object('script', 'generate-seed.ts'),\n      'seed'\n    FROM public.service_visits sv\n    ORDER BY sv.created_at\n    LIMIT 200;\n  END IF;\nEND $$;\n\nCOMMIT;\n`;

  const outputPath = resolve(process.cwd(), "supabase", "seed.sql");
  mkdirSync(resolve(process.cwd(), "supabase"), { recursive: true });
  writeFileSync(outputPath, sql, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Generated ${outputPath}`);
  // eslint-disable-next-line no-console
  console.log(`Counts -> clients: ${clients.length}, properties: ${properties.length}, plans: ${plans.length}, visits: ${visits.length}, invoices: ${invoices.length}, payments: ${payments.length}, photos: ${photos.length}`);
}

main();
