import { listCompletedVisitsMissingInvoice, listInvoices } from "@/lib/db/invoices";

import { InvoicesPageShell } from "./invoices-page-shell";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.invoicesRead);
  const params = await searchParams;
  const [invoices, rows] = await Promise.all([listInvoices(), listCompletedVisitsMissingInvoice()]);

  return (
    <InvoicesPageShell invoices={invoices} rows={rows} initialQuery={params.q ?? ""} initialStatus={params.status ?? ""} />
  );
}
