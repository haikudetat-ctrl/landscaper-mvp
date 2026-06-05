"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { InvoiceCard, mapInvoiceRowToCard } from "@/components/cards";
import { BottomSheetDialog } from "@/components/ui/bottom-sheet-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/status/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import type { Views } from "@/lib/types/database";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

type InvoiceBalance = Views<"v_invoice_balances">;
type SortKey = "due_date" | "invoice_date" | "client_name" | "invoice_status" | "amount_due" | "amount_remaining";
type SortDirection = "asc" | "desc";

function money(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function InvoiceDashboard({
  invoices,
  initialQuery = "",
  initialStatus = "",
}: {
  invoices: InvoiceBalance[];
  initialQuery?: string;
  initialStatus?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedInvoice, setExpandedInvoice] = useState<InvoiceBalance | null>(null);

  const statuses = useMemo(
    () => Array.from(new Set(invoices.map((invoice) => invoice.invoice_status).filter(Boolean) as string[])).sort(),
    [invoices],
  );

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return invoices
      .filter((invoice) => {
        if (status && invoice.invoice_status !== status) return false;
        if (!normalizedQuery) return true;

        const haystack = [
          invoice.invoice_number,
          invoice.client_name,
          invoice.street_1,
          invoice.city,
          invoice.state,
          invoice.postal_code,
          invoice.invoice_status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        let left: string | number = "";
        let right: string | number = "";

        if (sortKey === "due_date" || sortKey === "invoice_date") {
          left = dateValue(a[sortKey]);
          right = dateValue(b[sortKey]);
        } else if (sortKey === "amount_due" || sortKey === "amount_remaining") {
          left = money(a[sortKey]);
          right = money(b[sortKey]);
        } else {
          left = (a[sortKey] ?? "").toString().toLowerCase();
          right = (b[sortKey] ?? "").toString().toLowerCase();
        }

        if (left < right) return sortDirection === "asc" ? -1 : 1;
        if (left > right) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [invoices, query, sortDirection, sortKey, status]);

  function sortButton(key: SortKey, label: string) {
    const isActive = sortKey === key;

    return (
      <button
        type="button"
        onClick={() => {
          if (isActive) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
            return;
          }

          setSortKey(key);
          setSortDirection(key === "client_name" || key === "invoice_status" ? "asc" : "desc");
        }}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
          isActive ? "border-[#287b40] bg-emerald-100 text-zinc-950" : "border-emerald-200 bg-white text-zinc-800 hover:bg-emerald-50"
        }`}
      >
        {label}
        {isActive ? ` ${sortDirection === "asc" ? "up" : "down"}` : ""}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200/80 bg-white p-3 shadow-sm md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Find invoices</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Showing {filteredInvoices.length} of {invoices.length} invoices.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px] lg:min-w-[520px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search invoice #, contact, or address"
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
            >
              <option value="">All statuses</option>
              {statuses.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200/80 bg-white p-3 shadow-sm md:p-4">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Invoice drill-down</h2>
            <p className="mt-1 text-xs text-zinc-500">Sort and review matching invoices.</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {sortButton("due_date", "Due date")}
          {sortButton("invoice_date", "Invoice date")}
          {sortButton("client_name", "Contact")}
          {sortButton("invoice_status", "Status")}
          {sortButton("amount_due", "Total")}
          {sortButton("amount_remaining", "Remaining")}
        </div>

        {filteredInvoices.length === 0 ? (
          <EmptyState variant="inline" title="No invoices found" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {filteredInvoices.map((invoice) => (
                <button key={invoice.invoice_id} type="button" onClick={() => setExpandedInvoice(invoice)} className="block w-full text-left">
                  <InvoiceCard invoice={mapInvoiceRowToCard(invoice)} />
                </button>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Contact</Th>
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
                        <button
                          type="button"
                          onClick={() => setExpandedInvoice(invoice)}
                          className="min-h-11 text-left font-semibold text-zinc-950 underline decoration-emerald-600 underline-offset-4"
                        >
                          #{invoice.invoice_number ?? "-"}
                        </button>
                      </Td>
                      <Td>{invoice.client_name ?? "-"}</Td>
                      <Td className="font-semibold text-zinc-900">{formatAddress(invoice)}</Td>
                      <Td>{formatDate(invoice.due_date)}</Td>
                      <Td>
                        <StatusPill status={invoice.invoice_status} />
                      </Td>
                      <Td align="right">{formatCurrencyFromCents(invoice.amount_due)}</Td>
                      <Td align="right">{formatCurrencyFromCents(invoice.amount_paid)}</Td>
                      <Td align="right">{formatCurrencyFromCents(invoice.amount_remaining)}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </section>

      <BottomSheetDialog
        open={Boolean(expandedInvoice)}
        onClose={() => setExpandedInvoice(null)}
        eyebrow="Invoice"
        title={expandedInvoice ? `#${expandedInvoice.invoice_number ?? "Invoice"}` : "Invoice"}
      >
        {expandedInvoice ? (
          <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
            <InvoiceCard invoice={mapInvoiceRowToCard(expandedInvoice)} variant="expanded" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/invoices/${expandedInvoice.invoice_id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#287b40] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#236d38]"
              >
                Manage invoice
              </Link>
              {expandedInvoice.client_id ? (
                <Link
                  href={`/clients/${expandedInvoice.client_id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-50"
                >
                  Open client
                </Link>
              ) : (
                <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
                  Client record unavailable.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </BottomSheetDialog>
    </div>
  );
}
