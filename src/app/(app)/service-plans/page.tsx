import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FormField, inputClasses } from "@/components/ui/forms";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { listServicePlans } from "@/lib/db/service-plans";
import { formatAddress, formatCurrencyFromCents } from "@/lib/utils/format";

import { generateVisitsForActivePlansAction } from "@/app/(app)/service-plans/actions";

export default async function ServicePlansPage() {
  const plans = await listServicePlans();

  const todayDate = new Date();
  const inThirtyDate = new Date(todayDate);
  inThirtyDate.setDate(inThirtyDate.getDate() + 30);

  const today = todayDate.toISOString().slice(0, 10);
  const inThirty = inThirtyDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service Plans"
        description="Templates/rules that drive visit generation."
        actions={<LinkButton href="/service-plans/new" label="New service plan" />}
      />

      <SectionCard title="Generate Visits for Active Plans">
        <form action={generateVisitsForActivePlansAction} className="grid gap-3 md:grid-cols-4 md:items-end">
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

      {plans.length === 0 ? (
        <EmptyState title="No service plans yet" description="Create one to begin generating visits." />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/service-plans/${plan.id}`}
                className="block rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-semibold text-zinc-900">{plan.plan_name ?? "Untitled plan"}</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {Array.isArray(plan.service_types)
                    ? plan.service_types[0]?.label ?? "No service type"
                    : plan.service_types?.label ?? "No service type"}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-900">
                  {formatAddress(Array.isArray(plan.properties) ? plan.properties[0] ?? {} : plan.properties ?? {})}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-600">
                  <span>{plan.frequency_type ?? "-"}</span>
                  <StatusPill status={plan.status} />
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-800">{formatCurrencyFromCents(plan.quoted_price)}</p>
              </Link>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>Plan</Th>
                  <Th>Property</Th>
                  <Th>Frequency</Th>
                  <Th>Status</Th>
                  <Th align="right">Price</Th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-t border-zinc-200">
                    <Td>
                      <Link href={`/service-plans/${plan.id}`} className="font-medium underline">
                        {plan.plan_name ?? "Untitled plan"}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {Array.isArray(plan.service_types)
                          ? plan.service_types[0]?.label ?? "No service type"
                          : plan.service_types?.label ?? "No service type"}
                      </div>
                    </Td>
                    <Td className="font-medium">
                      {formatAddress(Array.isArray(plan.properties) ? plan.properties[0] ?? {} : plan.properties ?? {})}
                    </Td>
                    <Td>{plan.frequency_type ?? "-"}</Td>
                    <Td>
                      <StatusPill status={plan.status} />
                    </Td>
                    <Td align="right">{formatCurrencyFromCents(plan.quoted_price)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
