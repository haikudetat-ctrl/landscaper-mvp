import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { getClientDetail } from "@/lib/db/clients";
import { formatAddress, formatClientName, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client, properties, invoices } = await getClientDetail(id);

  return (
    <div className="space-y-4">
      <PageHeader
        title={formatClientName(client)}
        description="Client detail view"
        actions={<LinkButton href={`/clients/${id}/edit`} label="Edit client" />}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Contact">
          <p>{client.primary_email ?? "No email"}</p>
          <p>{client.primary_phone ?? "No phone"}</p>
          <p className="mt-2 text-sm text-zinc-600">{client.billing_notes ?? "No billing notes"}</p>
        </SectionCard>

        <SectionCard title="Notes">
          <p className="text-sm text-zinc-700">{client.cash_collection_notes ?? "No notes"}</p>
        </SectionCard>

        <SectionCard title="Linked Properties">
          <p className="text-2xl font-semibold">{properties.length}</p>
          <Link href="/properties/new" className="text-sm underline">
            Add property
          </Link>
        </SectionCard>
      </section>

      <SectionCard title="Properties">
        {properties.length === 0 ? (
          <EmptyState title="No properties linked to this client" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {properties.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="text-sm font-semibold text-zinc-900">{formatAddress(property)}</p>
                  <p className="mt-1 text-xs text-zinc-600">{property.service_notes ?? "No service notes"}</p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Address</Th>
                    <Th>Notes</Th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => (
                    <tr key={property.id} className="border-t border-zinc-200">
                      <Td>
                        <Link href={`/properties/${property.id}`} className="font-medium underline">
                          {formatAddress(property)}
                        </Link>
                      </Td>
                      <Td>{property.service_notes ?? "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Invoices">
        {invoices.length === 0 ? (
          <EmptyState title="No invoices for this client" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.invoice_id}
                  href={`/invoices/${invoice.invoice_id}`}
                  className="block rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">#{invoice.invoice_number ?? "-"}</p>
                    <StatusPill status={invoice.invoice_status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">Due {formatDate(invoice.due_date)}</p>
                  <p className="mt-1 text-xs font-medium text-zinc-800">
                    Remaining {formatCurrencyFromCents(invoice.amount_remaining)}
                  </p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Due</Th>
                    <Th>Status</Th>
                    <Th align="right">Remaining</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.invoice_id} className="border-t border-zinc-200">
                      <Td>
                        <Link href={`/invoices/${invoice.invoice_id}`} className="font-medium underline">
                          #{invoice.invoice_number ?? "-"}
                        </Link>
                      </Td>
                      <Td>{formatDate(invoice.due_date)}</Td>
                      <Td>{invoice.invoice_status ?? "-"}</Td>
                      <Td align="right">{formatCurrencyFromCents(invoice.amount_remaining)}</Td>
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
