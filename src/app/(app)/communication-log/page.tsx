import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { listCommunicationLog } from "@/lib/db/communications";
import { formatAddress, formatDateTime } from "@/lib/utils/format";

export default async function CommunicationLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q;
  const entries = await listCommunicationLog(query);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Communication Log"
        description="History of reminders, invoice messages, and outbound communication records."
      />

      <form className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm" method="GET">
        <input
          type="search"
          name="q"
          placeholder="Search recipient, subject, channel, or message type"
          defaultValue={query ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2.5 text-base md:py-2 md:text-sm"
        />
      </form>

      {entries.length === 0 ? (
        <EmptyState title="No communication history found" />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {entries.map((entry) => {
              const client = Array.isArray(entry.clients) ? entry.clients[0] : entry.clients;
              const property = Array.isArray(entry.properties) ? entry.properties[0] : entry.properties;

              return (
                <Link
                  key={entry.id}
                  href={`/communication-log/${entry.id}`}
                  className="block rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-700">{entry.message_type ?? "-"}</p>
                    <StatusPill status={entry.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-zinc-900">{entry.recipient ?? client?.full_name ?? "-"}</p>
                  <p className="mt-1 text-xs text-zinc-600">{formatAddress(property ?? {})}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.channel ?? "-"} • {formatDateTime(entry.sent_at ?? entry.created_at)}</p>
                </Link>
              );
            })}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Type</Th>
                  <Th>Channel</Th>
                  <Th>Recipient</Th>
                  <Th>Property</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const client = Array.isArray(entry.clients) ? entry.clients[0] : entry.clients;
                  const property = Array.isArray(entry.properties) ? entry.properties[0] : entry.properties;

                  return (
                    <tr key={entry.id} className="border-t border-zinc-200">
                      <Td>
                        <Link href={`/communication-log/${entry.id}`} className="font-medium underline">
                          {formatDateTime(entry.sent_at ?? entry.created_at)}
                        </Link>
                      </Td>
                      <Td>{entry.message_type ?? "-"}</Td>
                      <Td>{entry.channel ?? "-"}</Td>
                      <Td>{entry.recipient ?? client?.full_name ?? "-"}</Td>
                      <Td className="font-medium text-zinc-900">{formatAddress(property ?? {})}</Td>
                      <Td>
                        <StatusPill status={entry.status} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
