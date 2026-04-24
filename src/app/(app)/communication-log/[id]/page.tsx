import Link from "next/link";

import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getCommunicationLogById } from "@/lib/db/communications";
import { formatAddress, formatClientName, formatDateTime } from "@/lib/utils/format";

export default async function CommunicationLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getCommunicationLogById(id);
  const client = Array.isArray(entry.clients) ? entry.clients[0] : entry.clients;
  const property = Array.isArray(entry.properties) ? entry.properties[0] : entry.properties;

  return (
    <div className="space-y-4">
      <PageHeader
        title={entry.subject ?? "Communication Record"}
        description="Communication detail"
        actions={<LinkButton href="/communication-log" label="Back to log" tone="secondary" />}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Message Info">
          <p>Type: {entry.message_type ?? "-"}</p>
          <p>Channel: {entry.channel ?? "-"}</p>
          <p>Recipient: {entry.recipient ?? "-"}</p>
          <p className="mt-2">Status: <StatusPill status={entry.status} /></p>
        </SectionCard>

        <SectionCard title="Timing">
          <p>Created: {formatDateTime(entry.created_at)}</p>
          <p>Sent: {formatDateTime(entry.sent_at)}</p>
        </SectionCard>

        <SectionCard title="Links">
          <p>Client: {formatClientName(client ?? {})}</p>
          <p>Property: {formatAddress(property ?? {})}</p>
          {entry.invoice_id ? (
            <Link href={`/invoices/${entry.invoice_id}`} className="block underline">
              Open invoice
            </Link>
          ) : null}
          {entry.service_visit_id ? (
            <Link href={`/service-visits/${entry.service_visit_id}`} className="block underline">
              Open visit
            </Link>
          ) : null}
        </SectionCard>
      </section>

      <SectionCard title="Delivery">
        <div className="text-sm text-zinc-700">Provider message id: {entry.provider_message_id ?? "Not recorded"}</div>
        <div className="text-sm text-zinc-700">Error: {entry.error_message ?? "None"}</div>
      </SectionCard>
    </div>
  );
}
