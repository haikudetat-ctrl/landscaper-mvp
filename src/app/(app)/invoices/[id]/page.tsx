import { EmptyState } from "@/components/ui/empty-state";
import { FormField, inputClasses, selectClasses } from "@/components/ui/forms";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/status/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { OperationalTimeline } from "@/components/timeline/operational-timeline";
import { getInvoiceById } from "@/lib/db/invoices";
import { listTimelineEvents } from "@/lib/db/timeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { paymentMethods } from "@/lib/utils/constants";
import { formatAddress, formatClientName, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

import { recordPaymentAction, sendInvoiceAction } from "@/app/(app)/invoices/actions";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email_mode?: string; payment_recorded?: string; status?: string; message?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.invoicesRead);
  const { id } = await params;
  const query = await searchParams;
  const { invoice, balance, payments, mediaAssets } = await getInvoiceById(id);
  const supabase = createSupabaseServerClient();
  const { visitPhotoBucket } = getSupabaseEnv();
  const signedAssets = await Promise.all(
    mediaAssets
      .filter((asset) => asset.service_visit_id === invoice.service_visit_id)
      .map(async (asset) => {
        const signed = await supabase.storage.from(visitPhotoBucket).createSignedUrl(asset.storage_path, 60 * 60);
        return {
          ...asset,
          signedUrl: signed.data?.signedUrl ?? null,
        };
      }),
  );
  const timeline = await listTimelineEvents({
    entityType: "invoice",
    entityId: id,
    includeRelated: payments.map((payment) => ({
      entityType: "payment",
      entityId: payment.id,
    })),
  });
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
      {query.email_mode ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Invoice communication {query.email_mode === "sent" ? "sent" : "saved as preview"}.
        </div>
      ) : null}
      {query.payment_recorded ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Payment recorded.
        </div>
      ) : null}
      {query.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {query.message ?? "Invoice action failed. Please retry."}
        </div>
      ) : null}

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

      <SectionCard title="Send Invoice">
        <form action={sendInvoiceAction.bind(null, id)} className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="includeCreditCardPlaceholder" className="h-4 w-4" />
            Include credit card placeholder option in communication
          </label>
          <SubmitButton label="Send / Save Preview" pendingLabel="Processing..." />
        </form>
        <p className="mt-2 text-xs text-zinc-600">
          If no provider is configured (`LOAM_EMAIL_PROVIDER=enabled`), this stores preview content and logs preview mode.
        </p>
      </SectionCard>

      <SectionCard title="Payment History">
        {payments.length === 0 ? (
          <EmptyState variant="inline" title="No payments recorded" />
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

      <SectionCard title="Customer-Visible Photos">
        {signedAssets.length === 0 ? (
          <EmptyState variant="inline" title="No customer-visible photos linked yet" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {signedAssets.map((asset) => (
              <figure key={asset.id} className="overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.signedUrl ?? ""} alt="Visit proof photo" className="h-40 w-full object-cover" />
                <figcaption className="p-2 text-xs text-zinc-700">
                  {asset.photo_type} • {formatDate(asset.created_at)}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Operational Timeline">
        <OperationalTimeline items={timeline} />
      </SectionCard>
    </div>
  );
}
