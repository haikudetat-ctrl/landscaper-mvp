import { listClients } from "@/lib/db/clients";

import { ClientsPageShell } from "./clients-page-shell";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.clientsRead);
  const query = (await searchParams).q;
  const clients = await listClients(query);

  return <ClientsPageShell clients={clients} query={query} />;
}
