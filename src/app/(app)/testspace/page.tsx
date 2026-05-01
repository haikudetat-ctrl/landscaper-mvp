import { getDailyRunData, type DailyRunVisit } from "@/lib/db/daily-run";

import { Testspace } from "./testspace";

export default async function TestspacePage() {
  const data = await getDailyRunData();
  const previewVisit: DailyRunVisit | null = data.visits[0] ?? null;

  return <Testspace previewVisit={previewVisit} />;
}
