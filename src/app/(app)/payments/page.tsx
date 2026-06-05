import { PageHeader } from "@/components/ui/page-header";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/db/shared";
import { formatCurrencyFromCents } from "@/lib/utils/format";
import { markPaymentPaidAction } from "@/app/(app)/payments/actions";

function formatStreetAddress(property: { street_1?: string | null; street_2?: string | null }) {
  return [property.street_1, property.street_2].filter(Boolean).join(" ") || "-";
}

export default async function PaymentsPage() {
  await requirePagePermission(PERMISSIONS.paymentsRecord);
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("payments")
    .select("id, payment_date, amount, payment_method, status, reference_note, invoices(invoice_number, properties(street_1, street_2, city, state, postal_code))")
    .order("payment_date", { ascending: false })
    .limit(50);

  throwDbError(result.error, "Failed to load payments");

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Recent collections and payment status tracking." />
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="px-2.5 py-1.5">Property</th>
              <th className="px-2.5 py-1.5">Date</th>
              <th className="px-2.5 py-1.5">Method</th>
              <th className="px-2.5 py-1.5">Status</th>
              <th className="px-2.5 py-1.5">Amount</th>
              <th className="px-2.5 py-1.5">Action</th>
              <th className="px-2.5 py-1.5">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {((result.data ?? []) as Array<{
              id: string;
              payment_date: string;
              amount: number;
              payment_method: string;
              status?: string;
              invoices?:
                | {
                    invoice_number: string;
                    properties:
                      | {
                          street_1?: string | null;
                          street_2?: string | null;
                          city?: string | null;
                          state?: string | null;
                          postal_code?: string | null;
                        }
                      | Array<{
                          street_1?: string | null;
                          street_2?: string | null;
                          city?: string | null;
                          state?: string | null;
                          postal_code?: string | null;
                        }>
                      | null;
                  }
                | Array<{
                    invoice_number: string;
                    properties:
                      | {
                          street_1?: string | null;
                          street_2?: string | null;
                          city?: string | null;
                          state?: string | null;
                          postal_code?: string | null;
                        }
                      | Array<{
                          street_1?: string | null;
                          street_2?: string | null;
                          city?: string | null;
                          state?: string | null;
                          postal_code?: string | null;
                        }>
                      | null;
                  }>
                | null;
            }>).map((payment) => {
              const invoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices;
              const property = invoice?.properties
                ? Array.isArray(invoice.properties)
                  ? invoice.properties[0]
                  : invoice.properties
                : null;
              return (
                <tr key={payment.id} className="border-t border-zinc-100">
                  <td className="max-w-[260px] truncate px-2.5 py-1.5 font-medium text-zinc-900">{property ? formatStreetAddress(property) : "-"}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">{payment.payment_date}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">{payment.payment_method}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">{payment.status}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">{formatCurrencyFromCents(payment.amount ?? 0)}</td>
                  <td className="px-2.5 py-1.5">
                    {payment.status === "expected" || payment.status === "pending_confirmation" ? (
                      <form action={markPaymentPaidAction.bind(null, payment.id)} className="flex items-center gap-1">
                        <button className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold">Mark Paid</button>
                        <select name="method" defaultValue={payment.payment_method ?? "cash"} className="rounded border border-zinc-300 px-1 py-0.5 text-[11px]">
                          <option value="venmo">Venmo</option>
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                        </select>
                        <input name="reference" placeholder="Ref" className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-[11px]" />
                      </form>
                    ) : (
                      <span className="text-xs text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">{invoice?.invoice_number ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
