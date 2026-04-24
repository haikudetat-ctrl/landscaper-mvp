import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { listInvoices } from "@/lib/db/invoices";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const invoices = await listInvoices(params.q);

  const filteredInvoices = params.status
    ? invoices.filter((invoice) => (invoice.invoice_status ?? "") === params.status)
    : invoices;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Track invoice balances and manual payments."
        actions={<LinkButton href="/invoices/new" label="Create from completed visit" />}
      />

      <form className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:grid-cols-2" method="GET">
        <input
          type="search"
          name="q"
          placeholder="Search invoice #, client, or address"
          defaultValue={params.q ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2.5 text-base md:py-2 md:text-sm"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2.5 text-base md:py-2 md:text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">draft</option>
          <option value="sent">sent</option>
          <option value="partial">partial</option>
          <option value="paid">paid</option>
          <option value="overdue">overdue</option>
        </select>
      </form>

      {filteredInvoices.length === 0 ? (
        <EmptyState title="No invoices found" />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filteredInvoices.map((invoice) => (
              <Link
                key={invoice.invoice_id}
                href={`/invoices/${invoice.invoice_id}`}
                className="block rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">#{invoice.invoice_number ?? "-"}</p>
                  <StatusPill status={invoice.invoice_status} />
                </div>
                <p className="mt-1 text-xs text-zinc-600">{formatAddress(invoice)}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-600">
                  <span>Due {formatDate(invoice.due_date)}</span>
                  <span className="font-medium text-zinc-900">
                    {formatCurrencyFromCents(invoice.amount_remaining)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Property</Th>
                  <Th>Due date</Th>
                  <Th>Status</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Paid</Th>
                  <Th align="right">Remaining</Th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.invoice_id} className="border-t border-zinc-200">
                    <Td>
                      <Link href={`/invoices/${invoice.invoice_id}`} className="font-medium underline">
                        #{invoice.invoice_number ?? "-"}
                      </Link>
                    </Td>
                    <Td className="font-semibold text-zinc-900">{formatAddress(invoice)}</Td>
                    <Td>{formatDate(invoice.due_date)}</Td>
                    <Td>
                      <StatusPill status={invoice.invoice_status} />
                    </Td>
                    <Td align="right">{formatCurrencyFromCents(invoice.amount_due)}</Td>
                    <Td align="right">{formatCurrencyFromCents(invoice.amount_paid)}</Td>
                    <Td align="right" >{formatCurrencyFromCents(invoice.amount_remaining)}</Td>
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
