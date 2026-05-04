import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/status/status-pill";
import { formatCurrencyFromCents, formatDate } from "@/lib/utils/format";

export interface ClientCardData {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance?: number | null;
  status: "scheduled" | "completed" | "skipped" | "overdue" | "paused" | "needs_review";
  paymentPreference?: string | null;
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
}

export function ClientCard({
  client,
  variant = "compact",
  showQuickActions = true,
}: {
  client: ClientCardData;
  variant?: "compact" | "expanded";
  showQuickActions?: boolean;
}) {
  return (
    <Card className="rounded-2xl border border-emerald-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-zinc-950">{client.name}</p>
          {client.address ? <p className="mt-1 text-sm font-medium text-zinc-800">{client.address}</p> : null}
        </div>
        <StatusPill status={client.status} size="sm" />
      </div>

      {typeof client.balance === "number" && client.balance > 0 ? (
        <p className="mt-3 text-lg font-bold text-amber-900">Balance {formatCurrencyFromCents(client.balance)}</p>
      ) : null}

      <div className="mt-3 text-sm font-medium text-zinc-800">
        <p>{client.phone ?? "No phone"}</p>
        <p>{client.email ?? "No email"}</p>
        {client.paymentPreference ? <p className="mt-1 text-zinc-700">Prefers {client.paymentPreference}</p> : null}
      </div>

      {variant === "expanded" ? (
        <div className="mt-3 grid gap-1 text-xs font-medium text-zinc-700 sm:grid-cols-2">
          <p>Last service: {formatDate(client.lastServiceDate)}</p>
          <p>Next service: {formatDate(client.nextServiceDate)}</p>
        </div>
      ) : null}

      {showQuickActions ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <button className="min-h-11 rounded-full border border-emerald-300 bg-white px-3 py-2 font-bold text-zinc-900">Call</button>
          <button className="min-h-11 rounded-full border border-emerald-300 bg-white px-3 py-2 font-bold text-zinc-900">Text</button>
          <button className="min-h-11 rounded-full border border-emerald-300 bg-white px-3 py-2 font-bold text-zinc-900">View</button>
        </div>
      ) : null}
    </Card>
  );
}

export function mapClientRowToCard(input: {
  full_name: string;
  primary_phone?: string | null;
  primary_email?: string | null;
  payment_method_preference?: string | null;
  is_active?: boolean | null;
}) {
  return {
    name: input.full_name,
    phone: input.primary_phone,
    email: input.primary_email,
    paymentPreference: input.payment_method_preference,
    status: input.is_active ? "completed" : "paused",
  } satisfies ClientCardData;
}
