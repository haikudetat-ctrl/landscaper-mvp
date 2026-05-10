import { getDailyRunData, type DailyRunVisit } from "@/lib/db/daily-run";

import { Testspace } from "./testspace";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function TestspacePage() {
  await requirePagePermission(PERMISSIONS.supportAdmin);
  const data = await getDailyRunData();
  const previewVisit: DailyRunVisit | null = data.visits[0] ?? null;

  return <Testspace previewVisit={previewVisit} />;
}
