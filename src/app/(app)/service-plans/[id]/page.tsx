import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FormField, inputClasses } from "@/components/ui/forms";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServicePlanById } from "@/lib/db/service-plans";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

import { generateVisitsForPlanAction } from "@/app/(app)/service-plans/actions";

export default async function ServicePlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { plan } = await getServicePlanById(id);

  const supabase = createSupabaseServerClient();
  const visitsResult = await supabase
    .from("service_visits")
    .select("id, scheduled_date, status")
    .eq("service_plan_id", id)
    .order("scheduled_date", { ascending: false })
    .limit(20);

  const visits = visitsResult.data ?? [];

  const todayDate = new Date();
  const inThirtyDate = new Date(todayDate);
  inThirtyDate.setDate(inThirtyDate.getDate() + 30);

  const today = todayDate.toISOString().slice(0, 10);
  const inThirty = inThirtyDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHeader
        title={plan.plan_name ?? "Service plan"}
        description={formatAddress(Array.isArray(plan.properties) ? plan.properties[0] ?? {} : plan.properties ?? {})}
        actions={<LinkButton href={`/service-plans/${id}/edit`} label="Edit plan" />}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Status">
          <StatusPill status={plan.status} />
          <p className="mt-2 text-sm text-zinc-600">Frequency: {plan.frequency_type ?? "-"}</p>
        </SectionCard>

        <SectionCard title="Pricing">
          <p className="text-2xl font-semibold">{formatCurrencyFromCents(plan.quoted_price)}</p>
          <p className="text-sm text-zinc-600">Per generated visit</p>
        </SectionCard>

        <SectionCard title="Date Range">
          <p className="text-sm">Start: {formatDate(plan.start_date)}</p>
          <p className="text-sm">End: {formatDate(plan.end_date)}</p>
        </SectionCard>
      </section>

      <SectionCard title="Generate Visits For This Plan">
        <form action={generateVisitsForPlanAction.bind(null, id)} className="grid gap-3 md:grid-cols-4 md:items-end">
          <FormField label="Start date" name="startDate" required>
            <input id="startDate" name="startDate" type="date" defaultValue={today} className={inputClasses()} required />
          </FormField>
          <FormField label="End date" name="endDate" required>
            <input id="endDate" name="endDate" type="date" defaultValue={inThirty} className={inputClasses()} required />
          </FormField>
          <div className="md:col-span-2">
            <SubmitButton label="Generate visits" pendingLabel="Generating..." />
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Recent Generated Visits" right={<Link href="/service-visits" className="text-sm underline">Open all visits</Link>}>
        {visits.length === 0 ? (
          <EmptyState title="No visits generated yet" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {visits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/service-visits/${visit.id}`}
                  className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900">{formatDate(visit.scheduled_date)}</p>
                    <StatusPill status={visit.status} />
                  </div>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id} className="border-t border-zinc-200">
                      <Td>
                        <Link href={`/service-visits/${visit.id}`} className="font-medium underline">
                          {formatDate(visit.scheduled_date)}
                        </Link>
                      </Td>
                      <Td>
                        <StatusPill status={visit.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
