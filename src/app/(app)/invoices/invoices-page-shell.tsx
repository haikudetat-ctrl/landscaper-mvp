"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BottomSheetDialog } from "@/components/ui/bottom-sheet-dialog";
import { PageHeader } from "@/components/ui/page-header";
import type { listCompletedVisitsMissingInvoice, listInvoices } from "@/lib/db/invoices";
import type { CreateInvoiceFormState } from "@/app/(app)/invoices/actions";

import { InvoiceCreateList } from "./invoice-create-list";
import { InvoiceDashboard } from "./invoice-dashboard";

type Invoices = Awaited<ReturnType<typeof listInvoices>>;
type InvoiceCreateRows = Awaited<ReturnType<typeof listCompletedVisitsMissingInvoice>>;

export function InvoicesPageShell({
  invoices,
  rows,
  initialQuery,
  initialStatus,
}: {
  invoices: Invoices;
  rows: InvoiceCreateRows;
  initialQuery: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setFlashMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  function handleCreated(state: CreateInvoiceFormState) {
    setIsCreateOpen(false);
    setFlashMessage(state.success ?? "Invoice created successfully.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Track invoice balances and manual payments."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          >
            Create from completed visit
          </button>
        }
      />

      {flashMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm">
          {flashMessage}
        </p>
      ) : null}

      <InvoiceDashboard invoices={invoices} initialQuery={initialQuery} initialStatus={initialStatus} />

      <BottomSheetDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} eyebrow="Invoices" title="Create Invoices">
        <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
          <p className="mb-4 text-sm text-zinc-700">Use existing DB billing logic to generate invoices from completed visits.</p>
          <InvoiceCreateList rows={rows} onCreated={handleCreated} />
        </div>
      </BottomSheetDialog>
    </div>
  );
}
