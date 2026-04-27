"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import type { Tables } from "@/lib/types/database";
import { paymentMethods, planFrequencies, planStatuses } from "@/lib/utils/constants";

import type { ClientImportFormState } from "./actions";

type ServiceTypeOption = Pick<Tables<"service_types">, "id" | "label">;

type ImportRow = {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  paymentMethod: "venmo" | "cash" | "check" | "other";
  billingNotes: string;
  propertyName: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  accessNotes: string;
  serviceTypeId: string;
  planName: string;
  frequency: (typeof planFrequencies)[number];
  dayOfWeek: string;
  intervalDays: string;
  startDate: string;
  quotedPrice: string;
  status: (typeof planStatuses)[number];
  notes: string;
};

type RowIssue = {
  severity: "ready" | "warning" | "error";
  message: string;
};

const baseRow: ImportRow = {
  id: "row-1",
  clientName: "",
  email: "",
  phone: "",
  paymentMethod: "venmo",
  billingNotes: "",
  propertyName: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  accessNotes: "",
  serviceTypeId: "",
  planName: "",
  frequency: "weekly",
  dayOfWeek: "",
  intervalDays: "",
  startDate: "",
  quotedPrice: "",
  status: "active",
  notes: "",
};

const dayOptions = [
  ["", "Any day"],
  ["0", "Sun"],
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"],
] as const;

const initialState: ClientImportFormState = {
  error: null,
  result: null,
};

function newRow(id: string): ImportRow {
  return { ...baseRow, id };
}

function inputClasses(extra = "") {
  return `h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${extra}`;
}

function selectClasses(extra = "") {
  return `h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${extra}`;
}

function hasProperty(row: ImportRow) {
  return Boolean(row.propertyName || row.street1 || row.city || row.state || row.postalCode);
}

function hasPlan(row: ImportRow) {
  return Boolean(row.serviceTypeId || row.planName || row.startDate || row.quotedPrice);
}

function getRowIssue(row: ImportRow): RowIssue {
  if (!row.clientName.trim()) {
    return { severity: "error", message: "Contact name required" };
  }

  if (hasProperty(row) && (!row.street1.trim() || !row.city.trim() || !row.state.trim() || !row.postalCode.trim())) {
    return { severity: "error", message: "Complete property address" };
  }

  if (hasPlan(row) && !hasProperty(row)) {
    return { severity: "error", message: "Plan needs property" };
  }

  if (hasPlan(row) && (!row.serviceTypeId || !row.startDate || row.quotedPrice === "")) {
    return { severity: "error", message: "Complete service plan" };
  }

  if (row.frequency === "custom-interval" && hasPlan(row) && !row.intervalDays) {
    return { severity: "error", message: "Interval required" };
  }

  if (!hasProperty(row)) {
    return { severity: "warning", message: "Contact only" };
  }

  if (!hasPlan(row)) {
    return { severity: "warning", message: "No plan" };
  }

  return { severity: "ready", message: "Ready" };
}

function statusClasses(severity: RowIssue["severity"]) {
  if (severity === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-700";
}

function ImportSubmitButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Import rows
    </button>
  );
}

export function ClientImportWizard({
  action,
  serviceTypes,
}: {
  action: (previousState: ClientImportFormState, formData: FormData) => Promise<ClientImportFormState>;
  serviceTypes: ServiceTypeOption[];
}) {
  const [rows, setRows] = useState<ImportRow[]>([
    {
      ...newRow("row-1"),
      frequency: "weekly",
      status: "active",
    },
  ]);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction] = useActionState<ClientImportFormState, FormData>(action, initialState);

  const rowIssues = useMemo(() => rows.map(getRowIssue), [rows]);
  const summary = useMemo(
    () => ({
      clients: rows.filter((row) => row.clientName.trim()).length,
      properties: rows.filter(hasProperty).length,
      plans: rows.filter(hasPlan).length,
      errors: rowIssues.filter((issue) => issue.severity === "error").length,
    }),
    [rowIssues, rows],
  );
  const payload = useMemo(() => JSON.stringify({ rows }), [rows]);
  const hasErrors = summary.errors > 0 || rows.length === 0;

  function updateRow(id: string, patch: Partial<ImportRow>) {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, newRow(`row-${Date.now()}`)]);
  }

  function duplicateRow(row: ImportRow) {
    setRows((currentRows) => [
      ...currentRows,
      {
        ...row,
        id: `row-${Date.now()}`,
        clientName: `${row.clientName} copy`.trim(),
      },
    ]);
  }

  function removeRow(id: string) {
    setRows((currentRows) => (currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== id)));
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        setClientError(null);
        const firstError = rowIssues.find((issue) => issue.severity === "error");

        if (firstError) {
          event.preventDefault();
          setClientError(firstError.message);
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="payload" value={payload} />

      <section className="rounded-2xl border border-emerald-200/80 bg-[#f9fcf9] p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Contacts</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{summary.clients}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Properties</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{summary.properties}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Service plans</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{summary.plans}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Needs review</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{summary.errors}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 p-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Import workspace</h2>
            <p className="mt-1 text-xs text-zinc-500">One row creates one contact record, with optional property and plan.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-emerald-50"
            >
              Add row
            </button>
            <ImportSubmitButton disabled={hasErrors} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1940px] divide-y divide-emerald-100 text-sm">
            <thead>
              <tr className="bg-emerald-50/60 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <th className="sticky left-0 z-10 w-36 bg-emerald-50/95 px-3 py-2">Status</th>
                <th className="w-48 px-3 py-2">Contact</th>
                <th className="w-52 px-3 py-2">Email</th>
                <th className="w-40 px-3 py-2">Phone</th>
                <th className="w-32 px-3 py-2">Payment</th>
                <th className="w-48 px-3 py-2">Property name</th>
                <th className="w-56 px-3 py-2">Street</th>
                <th className="w-36 px-3 py-2">City</th>
                <th className="w-24 px-3 py-2">State</th>
                <th className="w-28 px-3 py-2">Postal</th>
                <th className="w-44 px-3 py-2">Service</th>
                <th className="w-48 px-3 py-2">Plan</th>
                <th className="w-36 px-3 py-2">Frequency</th>
                <th className="w-28 px-3 py-2">Interval</th>
                <th className="w-28 px-3 py-2">Day</th>
                <th className="w-32 px-3 py-2">Start</th>
                <th className="w-28 px-3 py-2 text-right">Price</th>
                <th className="w-32 px-3 py-2">Status</th>
                <th className="w-56 px-3 py-2">Notes</th>
                <th className="w-36 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row, index) => {
                const issue = rowIssues[index];

                return (
                  <tr key={row.id} className="bg-white align-top hover:bg-emerald-50/30">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 shadow-[1px_0_0_rgba(16,185,129,0.12)]">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(issue.severity)}`}>
                        {issue.message}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.clientName}
                        onChange={(event) => updateRow(row.id, { clientName: event.target.value })}
                        className={inputClasses()}
                        placeholder="Name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.email}
                        onChange={(event) => updateRow(row.id, { email: event.target.value })}
                        className={inputClasses()}
                        placeholder="email@example.com"
                        type="email"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.phone}
                        onChange={(event) => updateRow(row.id, { phone: event.target.value })}
                        className={inputClasses()}
                        placeholder="Phone"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.paymentMethod}
                        onChange={(event) => updateRow(row.id, { paymentMethod: event.target.value as ImportRow["paymentMethod"] })}
                        className={selectClasses()}
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.propertyName}
                        onChange={(event) => updateRow(row.id, { propertyName: event.target.value })}
                        className={inputClasses()}
                        placeholder="Optional"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.street1}
                        onChange={(event) => updateRow(row.id, { street1: event.target.value })}
                        className={inputClasses()}
                        placeholder="Street"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.city}
                        onChange={(event) => updateRow(row.id, { city: event.target.value })}
                        className={inputClasses()}
                        placeholder="City"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.state}
                        onChange={(event) => updateRow(row.id, { state: event.target.value.toUpperCase() })}
                        className={inputClasses()}
                        placeholder="NJ"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.postalCode}
                        onChange={(event) => updateRow(row.id, { postalCode: event.target.value })}
                        className={inputClasses()}
                        placeholder="ZIP"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.serviceTypeId}
                        onChange={(event) => updateRow(row.id, { serviceTypeId: event.target.value })}
                        className={selectClasses()}
                      >
                        <option value="">None</option>
                        {serviceTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.planName}
                        onChange={(event) => updateRow(row.id, { planName: event.target.value })}
                        className={inputClasses()}
                        placeholder="Plan name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.frequency}
                        onChange={(event) => updateRow(row.id, { frequency: event.target.value as ImportRow["frequency"] })}
                        className={selectClasses()}
                      >
                        {planFrequencies.map((frequency) => (
                          <option key={frequency} value={frequency}>
                            {frequency}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.intervalDays}
                        onChange={(event) => updateRow(row.id, { intervalDays: event.target.value })}
                        className={inputClasses("text-right")}
                        min={1}
                        placeholder="Days"
                        type="number"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.dayOfWeek}
                        onChange={(event) => updateRow(row.id, { dayOfWeek: event.target.value })}
                        className={selectClasses()}
                      >
                        {dayOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.startDate}
                        onChange={(event) => updateRow(row.id, { startDate: event.target.value })}
                        className={inputClasses()}
                        type="date"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.quotedPrice}
                        onChange={(event) => updateRow(row.id, { quotedPrice: event.target.value })}
                        className={inputClasses("text-right")}
                        min={0}
                        step="0.01"
                        type="number"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.status}
                        onChange={(event) => updateRow(row.id, { status: event.target.value as ImportRow["status"] })}
                        className={selectClasses()}
                      >
                        {planStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.notes}
                        onChange={(event) => updateRow(row.id, { notes: event.target.value })}
                        className={inputClasses()}
                        placeholder="Crew or billing notes"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateRow(row)}
                          className="rounded-full border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          className="rounded-full border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-10">
          {clientError || state.error ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-zinc-800">
              {clientError ?? state.error}
            </p>
          ) : null}
          {state.result ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              Imported {state.result.created.length} rows.{" "}
              <Link href="/clients" className="underline">
                View clients
              </Link>
            </p>
          ) : null}
        </div>
        <ImportSubmitButton disabled={hasErrors} />
      </div>
    </form>
  );
}
