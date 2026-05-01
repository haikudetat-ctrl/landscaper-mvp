"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BottomSheetDialog } from "@/components/ui/bottom-sheet-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { DataTable, Td, Th } from "@/components/ui/table";
import { formatClientName } from "@/lib/utils/format";
import type { listClients } from "@/lib/db/clients";
import { ClientForm } from "@/app/(app)/clients/client-form";
import { createClientSheetAction, type CreateClientFormState } from "@/app/(app)/clients/actions";

type Clients = Awaited<ReturnType<typeof listClients>>;

export function ClientsPageShell({
  clients,
  query,
}: {
  clients: Clients;
  query?: string;
}) {
  const router = useRouter();
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setFlashMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  function handleCreated(state: CreateClientFormState) {
    setIsNewClientOpen(false);
    setFlashMessage(state.success ?? "Client created successfully.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description="Manage client contact and billing details."
        actions={
          <>
            <LinkButton href="/clients/import" label="Bulk import" />
            <LinkButton href="/clients/new?onboarding=1" label="Onboard client" />
            <button
              type="button"
              onClick={() => setIsNewClientOpen(true)}
              className="rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-emerald-50"
            >
              New client
            </button>
          </>
        }
      />

      {flashMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm">
          {flashMessage}
        </p>
      ) : null}

      <form className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm" method="GET">
        <input
          type="search"
          name="q"
          placeholder="Search by client name, email, or phone"
          defaultValue={query ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2.5 text-base md:py-2 md:text-sm"
        />
      </form>

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Create your first client to start tracking properties." />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {clients.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`} className="block rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{formatClientName(client)}</p>
                  <StatusPill status={client.is_active ? "active" : "inactive"} />
                </div>
                <p className="mt-1 text-xs text-zinc-600">{client.primary_email ?? "-"}</p>
                <p className="mt-1 text-xs text-zinc-500">{client.primary_phone ?? "No phone"}</p>
              </Link>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>Client</Th>
                  <Th>Contact</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-t border-zinc-200">
                    <Td>
                      <Link href={`/clients/${client.id}`} className="font-medium underline">
                        {formatClientName(client)}
                      </Link>
                    </Td>
                    <Td>
                      <div>{client.primary_email ?? "-"}</div>
                      <div className="text-xs text-zinc-500">{client.primary_phone ?? "No phone"}</div>
                    </Td>
                    <Td>
                      <StatusPill status={client.is_active ? "active" : "inactive"} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}

      <BottomSheetDialog open={isNewClientOpen} onClose={() => setIsNewClientOpen(false)} eyebrow="Clients" title="New Client">
        <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-[6px] pb-6 pt-4 sm:px-[10px]">
          <ClientForm
            action={async () => {}}
            stateAction={createClientSheetAction}
            submitLabel="Create client"
            showCreateAndAddPropertyButton
            requiredFieldsNote="Required: Client display name, or both first and last name."
            onSuccess={handleCreated}
            resetOnSuccess
            className="px-[6px] sm:px-[10px]"
          />
        </div>
      </BottomSheetDialog>
    </div>
  );
}
