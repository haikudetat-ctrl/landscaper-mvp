import { EmptyState } from "@/components/ui/empty-state";
import { FormField, inputClasses, selectClasses } from "@/components/ui/forms";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { getInvoiceById } from "@/lib/db/invoices";
import { paymentMethods } from "@/lib/utils/constants";
import { formatAddress, formatClientName, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

import { recordPaymentAction } from "@/app/(app)/invoices/actions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { invoice, balance, payments } = await getInvoiceById(id);
  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
  const property = Array.isArray(invoice.properties) ? invoice.properties[0] : invoice.properties;

  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Invoice #${invoice.invoice_number ?? "-"}`}
        description="Invoice detail and payment history"
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/invoices" label="Back to invoices" tone="secondary" />
            {invoice.service_visit_id ? (
              <LinkButton href={`/service-visits/${invoice.service_visit_id}`} label="Open visit" tone="secondary" />
            ) : null}
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <SectionCard title="Status">
          <StatusPill status={balance.invoice_status ?? invoice.status} />
        </SectionCard>
        <SectionCard title="Total">
          <p className="text-2xl font-semibold">{formatCurrencyFromCents(balance.amount_due ?? invoice.amount_due)}</p>
        </SectionCard>
        <SectionCard title="Paid">
          <p className="text-2xl font-semibold">{formatCurrencyFromCents(balance.amount_paid)}</p>
        </SectionCard>
        <SectionCard title="Remaining">
          <p className="text-2xl font-semibold">{formatCurrencyFromCents(balance.amount_remaining)}</p>
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Billing">
          <p className="font-medium">{formatClientName(client ?? {})}</p>
          <p className="text-sm text-zinc-600">{formatAddress(property ?? {})}</p>
          <p className="mt-2 text-sm">Issued: {formatDate(invoice.invoice_date)}</p>
          <p className="text-sm">Due: {formatDate(invoice.due_date)}</p>
          <p className="mt-2 text-sm text-zinc-600">{invoice.payment_instructions_snapshot ?? "No invoice notes"}</p>
        </SectionCard>

        <SectionCard title="Record Payment">
          <form action={recordPaymentAction.bind(null, id)} className="space-y-3">
            <FormField label="Amount" name="amountCents" required>
              <input id="amountCents" name="amountCents" type="number" min={0.01} step="0.01" className={inputClasses()} required />
            </FormField>

            <FormField label="Payment date" name="paymentDate" required>
              <input
                id="paymentDate"
                name="paymentDate"
                type="date"
                defaultValue={defaultDate}
                className={inputClasses()}
                required
              />
            </FormField>

            <FormField label="Method" name="method" required>
              <select id="method" name="method" defaultValue="venmo" className={selectClasses()}>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Reference" name="reference">
              <input id="reference" name="reference" className={inputClasses()} />
            </FormField>

            <SubmitButton label="Record payment" pendingLabel="Saving..." />
          </form>
        </SectionCard>
      </section>

      <SectionCard title="Payment History">
        {payments.length === 0 ? (
          <EmptyState title="No payments recorded" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900">{formatDate(payment.payment_date)}</p>
                    <p className="text-sm font-semibold text-zinc-900">{formatCurrencyFromCents(payment.amount)}</p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{payment.payment_method ?? "-"}</p>
                  <p className="mt-1 text-xs text-zinc-500">{payment.reference_note ?? "No reference"}</p>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Method</Th>
                    <Th>Reference</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-zinc-200">
                      <Td>{formatDate(payment.payment_date)}</Td>
                      <Td>{payment.payment_method ?? "-"}</Td>
                      <Td>{payment.reference_note ?? "-"}</Td>
                      <Td align="right">{formatCurrencyFromCents(payment.amount)}</Td>
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
