"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { FormField, inputClasses } from "@/components/ui/forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { formatAddress, formatCurrencyFromCents, formatDate } from "@/lib/utils/format";
import type { listCompletedVisitsMissingInvoice } from "@/lib/db/invoices";
import {
  createInvoiceFromVisitSheetAction,
  type CreateInvoiceFormState,
} from "@/app/(app)/invoices/actions";

type InvoiceCreateRows = Awaited<ReturnType<typeof listCompletedVisitsMissingInvoice>>;

function InvoiceCreateRowForm({
  row,
  onCreated,
}: {
  row: InvoiceCreateRows[number];
  onCreated?: (state: CreateInvoiceFormState) => void;
}) {
  const lastHandledCreatedIdRef = useRef<string | null>(null);
  const [state, formAction] = useActionState<CreateInvoiceFormState, FormData>(
    createInvoiceFromVisitSheetAction.bind(null, row.service_visit_id ?? ""),
    {
      error: null,
      success: null,
      createdId: null,
    },
  );

  useEffect(() => {
    if (!state.createdId || lastHandledCreatedIdRef.current === state.createdId) {
      return;
    }

    lastHandledCreatedIdRef.current = state.createdId;
    onCreated?.(state);
  }, [onCreated, state]);

  return (
    <form action={formAction} className="mt-3 flex items-end gap-2">
      <FormField label="Due days" name="dueDays">
        <input
          id={`dueDays-${row.service_visit_id}`}
          name="dueDays"
          defaultValue={14}
          type="number"
          min={0}
          max={180}
          className={inputClasses()}
        />
      </FormField>
      <SubmitButton label="Create" pendingLabel="Creating..." />
      {state.error ? <p className="text-xs font-semibold text-red-700">{state.error}</p> : null}
    </form>
  );
}

export function InvoiceCreateList({
  rows,
  onCreated,
}: {
  rows: InvoiceCreateRows;
  onCreated?: (state: CreateInvoiceFormState) => void;
}) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">No completed visits are missing invoices.</p>;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.service_visit_id} className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
            <Link href={`/service-visits/${row.service_visit_id}`} className="text-sm font-semibold underline">
              {formatAddress(row)}
            </Link>
            <p className="mt-1 text-xs text-zinc-600">{row.client_name ?? "-"}</p>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-600">
              <span>{formatDate(row.completion_timestamp)}</span>
              <span className="font-medium text-zinc-900">{formatCurrencyFromCents(row.quoted_price)}</span>
            </div>
            <InvoiceCreateRowForm row={row} onCreated={onCreated} />
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <DataTable>
          <thead>
            <tr>
              <Th>Completed date</Th>
              <Th>Property</Th>
              <Th>Client</Th>
              <Th align="right">Suggested total</Th>
              <Th>Create invoice</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.service_visit_id} className="border-t border-zinc-200">
                <Td>
                  <Link href={`/service-visits/${row.service_visit_id}`} className="font-medium underline">
                    {formatDate(row.completion_timestamp)}
                  </Link>
                </Td>
                <Td className="font-semibold text-zinc-900">{formatAddress(row)}</Td>
                <Td>{row.client_name ?? "-"}</Td>
                <Td align="right">{formatCurrencyFromCents(row.quoted_price)}</Td>
                <Td>
                  <InvoiceCreateRowForm row={row} onCreated={onCreated} />
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}
