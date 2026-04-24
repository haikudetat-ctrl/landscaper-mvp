import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatAddress } from "@/lib/utils/format";

type SearchSuggestion = {
  id: string;
  href: string;
  title: string;
  path: string;
  subtitle?: string;
};

function toLikePattern(value: string): string {
  const cleaned = value.replace(/[,%()]/g, " ").trim();
  return `%${cleaned}%`;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] as SearchSuggestion[] });
  }

  const supabase = createSupabaseServerClient();
  const pattern = toLikePattern(q);

  const [
    clientsResult,
    propertiesResult,
    serviceTypesResult,
    servicePlansResult,
    serviceVisitsResult,
    visitPhotosResult,
    invoicesResult,
    paymentsResult,
    communicationResult,
    shiftLogsResult,
    automationRulesResult,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, primary_email, primary_phone")
      .or(`full_name.ilike.${pattern},primary_email.ilike.${pattern},primary_phone.ilike.${pattern}`)
      .limit(3),
    supabase
      .from("properties")
      .select("id, street_1, street_2, city, state, postal_code, property_name")
      .or(
        `street_1.ilike.${pattern},street_2.ilike.${pattern},city.ilike.${pattern},state.ilike.${pattern},postal_code.ilike.${pattern},property_name.ilike.${pattern}`,
      )
      .limit(3),
    supabase
      .from("service_types")
      .select("id, label, code")
      .or(`label.ilike.${pattern},code.ilike.${pattern}`)
      .limit(2),
    supabase
      .from("service_plans")
      .select("id, plan_name, frequency_type, status, notes")
      .or(`plan_name.ilike.${pattern},frequency_type.ilike.${pattern},status.ilike.${pattern},notes.ilike.${pattern}`)
      .limit(3),
    supabase
      .from("service_visits")
      .select("id, scheduled_date, status, operator_notes, skip_reason, completion_notes")
      .or(
        `status.ilike.${pattern},operator_notes.ilike.${pattern},skip_reason.ilike.${pattern},completion_notes.ilike.${pattern}`,
      )
      .limit(3),
    supabase
      .from("visit_photos")
      .select("id, service_visit_id, photo_type, caption, storage_path")
      .or(`photo_type.ilike.${pattern},caption.ilike.${pattern},storage_path.ilike.${pattern}`)
      .limit(2),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, due_date")
      .or(`invoice_number.ilike.${pattern},status.ilike.${pattern}`)
      .limit(3),
    supabase
      .from("payments")
      .select("id, invoice_id, payment_method, payment_date, reference_note")
      .or(`payment_method.ilike.${pattern},reference_note.ilike.${pattern}`)
      .limit(3),
    supabase
      .from("communication_log")
      .select("id, message_type, channel, recipient, subject, status")
      .or(`recipient.ilike.${pattern},subject.ilike.${pattern},message_type.ilike.${pattern},channel.ilike.${pattern},status.ilike.${pattern}`)
      .limit(3),
    supabase
      .from("schedule_shift_logs")
      .select("id, source_date, target_date, shift_reason, notes")
      .or(`shift_reason.ilike.${pattern},notes.ilike.${pattern}`)
      .limit(2),
    supabase
      .from("automation_rules")
      .select("id, label, rule_code, template_key, trigger_event, channel")
      .or(
        `label.ilike.${pattern},rule_code.ilike.${pattern},template_key.ilike.${pattern},trigger_event.ilike.${pattern},channel.ilike.${pattern}`,
      )
      .limit(2),
  ]);

  const suggestions: SearchSuggestion[] = [];

  for (const row of clientsResult.data ?? []) {
    suggestions.push({
      id: `clients-${row.id}`,
      href: `/clients/${row.id}`,
      title: row.full_name,
      path: "Clients",
      subtitle: [row.primary_email, row.primary_phone].filter(Boolean).join(" • "),
    });
  }

  for (const row of propertiesResult.data ?? []) {
    suggestions.push({
      id: `properties-${row.id}`,
      href: `/properties/${row.id}`,
      title: formatAddress(row),
      path: "Properties",
      subtitle: row.property_name ?? undefined,
    });
  }

  for (const row of serviceTypesResult.data ?? []) {
    suggestions.push({
      id: `service-types-${row.id}`,
      href: "/service-plans",
      title: row.label,
      path: "Service Types",
      subtitle: row.code,
    });
  }

  for (const row of servicePlansResult.data ?? []) {
    suggestions.push({
      id: `service-plans-${row.id}`,
      href: `/service-plans/${row.id}`,
      title: row.plan_name,
      path: "Service Plans",
      subtitle: [row.frequency_type, row.status].filter(Boolean).join(" • "),
    });
  }

  for (const row of serviceVisitsResult.data ?? []) {
    suggestions.push({
      id: `service-visits-${row.id}`,
      href: `/service-visits/${row.id}`,
      title: row.scheduled_date ?? "Service visit",
      path: "Service Visits",
      subtitle: row.status ?? row.operator_notes ?? row.skip_reason ?? row.completion_notes ?? undefined,
    });
  }

  for (const row of visitPhotosResult.data ?? []) {
    suggestions.push({
      id: `visit-photos-${row.id}`,
      href: row.service_visit_id ? `/service-visits/${row.service_visit_id}` : "/service-visits",
      title: row.caption ?? row.photo_type,
      path: "Visit Photos",
      subtitle: row.storage_path,
    });
  }

  for (const row of invoicesResult.data ?? []) {
    suggestions.push({
      id: `invoices-${row.id}`,
      href: `/invoices/${row.id}`,
      title: `Invoice #${row.invoice_number}`,
      path: "Invoices",
      subtitle: [row.status, row.due_date].filter(Boolean).join(" • "),
    });
  }

  for (const row of paymentsResult.data ?? []) {
    suggestions.push({
      id: `payments-${row.id}`,
      href: row.invoice_id ? `/invoices/${row.invoice_id}` : "/invoices",
      title: `${row.payment_method} payment`,
      path: "Payments",
      subtitle: [row.payment_date, row.reference_note].filter(Boolean).join(" • "),
    });
  }

  for (const row of communicationResult.data ?? []) {
    suggestions.push({
      id: `communication-${row.id}`,
      href: `/communication-log/${row.id}`,
      title: row.recipient,
      path: "Communication Log",
      subtitle: [row.message_type, row.channel, row.status].filter(Boolean).join(" • "),
    });
  }

  for (const row of shiftLogsResult.data ?? []) {
    suggestions.push({
      id: `shift-logs-${row.id}`,
      href: "/service-visits",
      title: `${row.source_date} → ${row.target_date}`,
      path: "Schedule Shift Logs",
      subtitle: [row.shift_reason, row.notes].filter(Boolean).join(" • "),
    });
  }

  for (const row of automationRulesResult.data ?? []) {
    suggestions.push({
      id: `automation-rules-${row.id}`,
      href: "/service-plans",
      title: row.label,
      path: "Automation Rules",
      subtitle: [row.trigger_event, row.channel, row.rule_code].filter(Boolean).join(" • "),
    });
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, 25),
  });
}
