import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { listInvoices } from "@/lib/db/invoices";

import { InvoiceDashboard } from "./invoice-dashboard";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const invoices = await listInvoices();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Track invoice balances and manual payments."
        actions={<LinkButton href="/invoices/new" label="Create from completed visit" />}
      />

      <InvoiceDashboard invoices={invoices} initialQuery={params.q ?? ""} initialStatus={params.status ?? ""} />
    </div>
  );
}
