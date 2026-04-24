import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { listProperties } from "@/lib/db/properties";
import { formatAddress } from "@/lib/utils/format";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q;
  const properties = await listProperties(query);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Properties"
        description="Addresses are primary for daily operations."
        actions={<LinkButton href="/properties/new" label="New property" />}
      />

      <form className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm" method="GET">
        <input
          type="search"
          name="q"
          placeholder="Search by address or city"
          defaultValue={query ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2.5 text-base md:py-2 md:text-sm"
        />
      </form>

      {properties.length === 0 ? (
        <EmptyState title="No properties yet" description="Create a property to begin plan and visit scheduling." />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="block rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-semibold text-zinc-900">{formatAddress(property)}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-600">
                    {Array.isArray(property.clients)
                      ? property.clients[0]?.full_name ?? "-"
                      : property.clients?.full_name ?? "-"}
                  </p>
                  <StatusPill status={property.is_active ? "active" : "inactive"} />
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>Address</Th>
                  <Th>Client</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id} className="border-t border-zinc-200">
                    <Td>
                      <Link href={`/properties/${property.id}`} className="font-semibold text-zinc-900 underline">
                        {formatAddress(property)}
                      </Link>
                    </Td>
                    <Td>{Array.isArray(property.clients) ? property.clients[0]?.full_name ?? "-" : property.clients?.full_name ?? "-"}</Td>
                    <Td>
                      <StatusPill status={property.is_active ? "active" : "inactive"} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
