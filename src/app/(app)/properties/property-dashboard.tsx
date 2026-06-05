"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PropertyCard } from "@/components/cards";
import { BottomSheetDialog } from "@/components/ui/bottom-sheet-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/status/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { formatAddress } from "@/lib/utils/format";

type ClientRelation = {
  id: string;
  full_name: string;
  primary_email: string | null;
  primary_phone: string | null;
};

export type PropertyDashboardRecord = {
  id: string;
  property_name: string | null;
  street_1: string;
  street_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  service_notes: string | null;
  access_notes: string | null;
  clients: ClientRelation | ClientRelation[] | null;
};

type MappableProperty = PropertyDashboardRecord & {
  latitude: number;
  longitude: number;
};

function getClientName(property: PropertyDashboardRecord) {
  const client = Array.isArray(property.clients) ? property.clients[0] : property.clients;
  return client?.full_name ?? "-";
}

function isMappable(property: PropertyDashboardRecord): property is MappableProperty {
  return typeof property.latitude === "number" && typeof property.longitude === "number";
}

export function PropertyDashboard({ properties }: { properties: PropertyDashboardRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [detailProperty, setDetailProperty] = useState<PropertyDashboardRecord | null>(null);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return properties.filter((property) => {
      if (status === "active" && !property.is_active) return false;
      if (status === "inactive" && property.is_active) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        property.property_name,
        property.street_1,
        property.street_2,
        property.city,
        property.state,
        property.postal_code,
        getClientName(property),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [properties, query, status]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200/80 bg-white p-3 shadow-sm md:p-4">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Property drill-down</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Showing {filteredProperties.length} of {properties.length} properties.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px] lg:min-w-[520px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search address, contact, or city"
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <EmptyState variant="inline" title="No properties found" description="Adjust the search or status filter." />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {filteredProperties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => setDetailProperty(property)}
                  className="block w-full text-left"
                >
                  <PropertyCard
                    property={{
                      address: formatAddress(property),
                      clientName: getClientName(property),
                      accessNotes: property.access_notes,
                      propertyNotes: property.service_notes,
                      status: property.is_active ? "completed" : "paused",
                    }}
                    variant="compact"
                  />
                </button>
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
                  {filteredProperties.map((property) => (
                    <tr key={property.id} className="border-t border-zinc-200">
                      <Td>
                        <button
                          type="button"
                          onClick={() => setDetailProperty(property)}
                          className="min-h-11 text-left font-semibold text-zinc-950 underline decoration-emerald-600 underline-offset-4"
                        >
                          {formatAddress(property)}
                        </button>
                      </Td>
                      <Td>{getClientName(property)}</Td>
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
      </section>

      <BottomSheetDialog
        open={Boolean(detailProperty)}
        onClose={() => setDetailProperty(null)}
        eyebrow="Property"
        title={detailProperty ? detailProperty.property_name || formatAddress(detailProperty) : "Property"}
      >
        {detailProperty ? (
          <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
            <PropertyCard
              property={{
                address: formatAddress(detailProperty),
                clientName: getClientName(detailProperty),
                accessNotes: detailProperty.access_notes,
                propertyNotes: detailProperty.service_notes,
                status: detailProperty.is_active ? "completed" : "paused",
              }}
              variant="expanded"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/properties/${detailProperty.id}/edit`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-50"
              >
                Edit property
              </Link>
              {isMappable(detailProperty) ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${detailProperty.latitude}&mlon=${detailProperty.longitude}#map=17/${detailProperty.latitude}/${detailProperty.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#287b40] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#236d38]"
                >
                  Open map
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </BottomSheetDialog>
    </div>
  );
}
