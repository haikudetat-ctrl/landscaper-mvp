import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FormField, inputClasses } from "@/components/ui/forms";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { listCompletedVisitsMissingInvoice } from "@/lib/db/invoices";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

import { createInvoiceFromVisitAction } from "@/app/(app)/invoices/actions";

export default async function CreateInvoiceFromVisitPage() {
  const rows = await listCompletedVisitsMissingInvoice();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Create Invoices from Completed Visits"
        description="Use existing DB billing logic to generate invoices."
        actions={<LinkButton href="/invoices" label="Back to invoices" tone="secondary" />}
      />

      {rows.length === 0 ? (
        <EmptyState title="No completed visits are missing invoices" />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <div key={row.service_visit_id} className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
                <Link href={`/service-visits/${row.service_visit_id}`} className="text-sm font-semibold underline">
                  {formatAddress(row)}
                </Link>
                <p className="mt-1 text-xs text-zinc-600">{row.client_name ?? "-"}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-600">
                  <span>{formatDate(row.completion_timestamp)}</span>
                  <span className="font-medium text-zinc-900">{formatCurrencyFromCents(row.quoted_price)}</span>
                </div>
                <form action={createInvoiceFromVisitAction.bind(null, row.service_visit_id ?? "")} className="mt-3 flex items-end gap-2">
                  <FormField label="Due days" name="dueDays">
                    <input
                      id={`dueDays-mobile-${row.service_visit_id}`}
                      name="dueDays"
                      defaultValue={14}
                      type="number"
                      min={0}
                      max={180}
                      className={inputClasses()}
                    />
                  </FormField>
                  <SubmitButton label="Create" pendingLabel="Creating..." />
                </form>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>Completed date</Th>
                  <Th>Property</Th>
                  <Th>Client</Th>
                  <Th align="right">Suggested total</Th>
                  <Th>Create invoice</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.service_visit_id} className="border-t border-zinc-200">
                    <Td>
                      <Link href={`/service-visits/${row.service_visit_id}`} className="font-medium underline">
                        {formatDate(row.completion_timestamp)}
                      </Link>
                    </Td>
                    <Td className="font-semibold text-zinc-900">{formatAddress(row)}</Td>
                    <Td>{row.client_name ?? "-"}</Td>
                    <Td align="right">{formatCurrencyFromCents(row.quoted_price)}</Td>
                    <Td>
                      <form action={createInvoiceFromVisitAction.bind(null, row.service_visit_id ?? "")} className="flex items-end gap-2">
                        <FormField label="Due days" name="dueDays">
                          <input
                            id={`dueDays-${row.service_visit_id}`}
                            name="dueDays"
                            defaultValue={14}
                            type="number"
                            min={0}
                            max={180}
                            className={inputClasses()}
                          />
                        </FormField>
                        <SubmitButton label="Create" pendingLabel="Creating..." />
                      </form>
                    </Td>
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
