import { Card } from "@/components/ui/card";
import { normalizeOpsStatus, StatusPill } from "@/components/status/status-pill";
import { formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

export interface InvoiceCardData {
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate?: string | null;
  status: string;
  paymentMethod?: string | null;
  relatedJobs?: string[];
}

export function InvoiceCard({ invoice, variant = "compact" }: { invoice: InvoiceCardData; variant?: "compact" | "expanded" }) {
  return (
    <Card className="rounded-2xl border border-emerald-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-zinc-950">#{invoice.invoiceNumber}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-800">{invoice.clientName}</p>
        </div>
        <StatusPill status={invoice.status} size="sm" />
      </div>
      <p className="mt-3 text-3xl font-bold text-zinc-950">{formatCurrencyFromCents(invoice.amount)}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-800">Due {formatDate(invoice.dueDate)}</p>
      {variant === "expanded" ? (
        <div className="mt-2 text-sm font-medium text-zinc-700">
          {invoice.paymentMethod ? <p>Method: {invoice.paymentMethod}</p> : null}
          {invoice.relatedJobs?.length ? <p>Related jobs: {invoice.relatedJobs.join(", ")}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}

export function mapInvoiceRowToCard(input: {
  invoice_number?: string | null;
  client_name?: string | null;
  amount_remaining?: number | null;
  due_date?: string | null;
  invoice_status?: string | null;
}) {
  const status = input.invoice_status === "paid" ? "completed" : input.invoice_status === "overdue" ? "overdue" : normalizeOpsStatus(input.invoice_status);
  return {
    invoiceNumber: input.invoice_number ?? "-",
    clientName: input.client_name ?? "No client",
    amount: input.amount_remaining ?? 0,
    dueDate: input.due_date,
    status,
  } satisfies InvoiceCardData;
}
