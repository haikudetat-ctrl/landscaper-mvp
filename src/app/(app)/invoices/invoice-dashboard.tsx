"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import type { Views } from "@/lib/types/database";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

type InvoiceBalance = Views<"v_invoice_balances">;
type SortKey = "due_date" | "invoice_date" | "client_name" | "invoice_status" | "amount_due" | "amount_remaining";
type SortDirection = "asc" | "desc";

const statusColors: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#287b40",
  partial: "#d89b1d",
  paid: "#5a9f70",
  overdue: "#c2410c",
};

const agingBuckets = [
  { key: "current", label: "Current", min: -Infinity, max: 0 },
  { key: "1-15", label: "1-15", min: 1, max: 15 },
  { key: "16-30", label: "16-30", min: 16, max: 30 },
  { key: "31-60", label: "31-60", min: 31, max: 60 },
  { key: "60+", label: "60+", min: 61, max: Infinity },
];

function money(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function daysPastDue(value: string | null | undefined) {
  if (!value) return 0;
  const due = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function ChartFrame({
  height,
  children,
}: {
  height: number;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => setWidth(Math.max(Math.floor(element.getBoundingClientRect().width), 0));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-w-0 w-full" style={{ height }}>
      {width > 0 ? children({ width, height }) : null}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-zinc-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name ?? "value"} className="text-zinc-700">
          {entry.name ?? "Amount"}: {formatCurrencyFromCents(entry.value ?? 0)}
        </p>
      ))}
    </div>
  );
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

  const dashboard = useMemo(() => {
    const totalBilled = invoices.reduce((sum, invoice) => sum + money(invoice.amount_due), 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + money(invoice.amount_paid), 0);
    const outstanding = invoices.reduce((sum, invoice) => sum + money(invoice.amount_remaining), 0);
    const overdueOutstanding = invoices.reduce((sum, invoice) => {
      const remaining = money(invoice.amount_remaining);
      if (remaining <= 0) return sum;
      return daysPastDue(invoice.due_date) > 0 || invoice.invoice_status === "overdue" ? sum + remaining : sum;
    }, 0);

    const statusMap = new Map<string, { label: string; count: number; amount: number }>();
    for (const invoice of invoices) {
      const label = invoice.invoice_status ?? "unknown";
      const current = statusMap.get(label) ?? { label, count: 0, amount: 0 };
      current.count += 1;
      current.amount += money(invoice.amount_remaining);
      statusMap.set(label, current);
    }

    const bucketData = agingBuckets.map((bucket) => {
      const amount = invoices.reduce((sum, invoice) => {
        const remaining = money(invoice.amount_remaining);
        const days = daysPastDue(invoice.due_date);
        if (remaining <= 0) return sum;
        return days >= bucket.min && days <= bucket.max ? sum + remaining : sum;
      }, 0);

      return { label: bucket.label, amount };
    });

    return {
      totalBilled,
      totalPaid,
      outstanding,
      overdueOutstanding,
      collectionRate: totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0,
      statusData: Array.from(statusMap.values()).sort((a, b) => b.amount - a.amount),
      agingData: bucketData,
    };
  }, [invoices]);

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
          isActive ? "border-zinc-900 bg-zinc-900 text-white" : "border-emerald-200 bg-white text-zinc-700 hover:bg-emerald-50"
        }`}
      >
        {label}
        {isActive ? ` ${sortDirection === "asc" ? "up" : "down"}` : ""}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200/80 bg-[#f9fcf9] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-950">{formatCurrencyFromCents(dashboard.outstanding)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-[#f9fcf9] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Overdue risk</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-950">{formatCurrencyFromCents(dashboard.overdueOutstanding)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-[#f9fcf9] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Collected</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-950">{formatCurrencyFromCents(dashboard.totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-[#f9fcf9] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Collection rate</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-950">{percent(dashboard.collectionRate)}</p>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Aging exposure</h2>
              <p className="mt-1 text-xs text-zinc-500">Remaining balance by days past due.</p>
            </div>
          </div>
          <ChartFrame height={260}>
            {({ width, height }) => (
              <BarChart width={width} height={height} data={dashboard.agingData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e4efe7" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#4b6957" }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#4b6957" }}
                  tickFormatter={(value: number) => `$${Math.round(value)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Remaining" radius={[8, 8, 0, 0]} fill="#287b40" />
              </BarChart>
            )}
          </ChartFrame>
        </div>

        <div className="min-w-0 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Status mix</h2>
            <p className="mt-1 text-xs text-zinc-500">Open money and invoice count by state.</p>
          </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[180px_minmax(0,1fr)]">
            <ChartFrame height={180}>
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Pie
                    data={dashboard.statusData}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {dashboard.statusData.map((entry) => (
                      <Cell key={entry.label} fill={statusColors[entry.label] ?? "#6b8f76"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              )}
            </ChartFrame>
            <div className="space-y-2">
              {dashboard.statusData.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() => setStatus((current) => (current === entry.label ? "" : entry.label))}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-[#f9fcf9] px-3 py-2 text-left hover:bg-emerald-50"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusColors[entry.label] ?? "#6b8f76" }}
                    />
                    {entry.label}
                  </span>
                  <span className="text-right text-xs text-zinc-600">
                    <span className="block font-semibold text-zinc-900">{formatCurrencyFromCents(entry.amount)}</span>
                    {entry.count} invoices
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200/80 bg-white p-3 shadow-sm md:p-4">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Invoice drill-down</h2>
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

        <div className="mb-3 flex flex-wrap gap-2">
          {sortButton("due_date", "Due date")}
          {sortButton("invoice_date", "Invoice date")}
          {sortButton("client_name", "Contact")}
          {sortButton("invoice_status", "Status")}
          {sortButton("amount_due", "Total")}
          {sortButton("amount_remaining", "Remaining")}
        </div>

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
                  <p className="mt-1 text-xs text-zinc-600">{invoice.client_name ?? "No contact"}</p>
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
                        <Link href={`/invoices/${invoice.invoice_id}`} className="font-medium underline">
                          #{invoice.invoice_number ?? "-"}
                        </Link>
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
    </div>
  );
}
