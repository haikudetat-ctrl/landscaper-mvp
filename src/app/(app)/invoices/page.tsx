import { listCompletedVisitsMissingInvoice, listInvoices } from "@/lib/db/invoices";

import { InvoicesPageShell } from "./invoices-page-shell";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const [invoices, rows] = await Promise.all([listInvoices(), listCompletedVisitsMissingInvoice()]);

  return (
    <InvoicesPageShell invoices={invoices} rows={rows} initialQuery={params.q ?? ""} initialStatus={params.status ?? ""} />
  );
}
