import { listClients } from "@/lib/db/clients";

import { ClientsPageShell } from "./clients-page-shell";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q;
  const clients = await listClients(query);

  return <ClientsPageShell clients={clients} query={query} />;
}
