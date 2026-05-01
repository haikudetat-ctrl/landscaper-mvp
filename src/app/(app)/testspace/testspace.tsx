import { PageHeader } from "@/components/ui/page-header";
import type { DailyRunVisit } from "@/lib/db/daily-run";

export function Testspace({ previewVisit }: { previewVisit: DailyRunVisit | null }) {
  void previewVisit;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader title="Testspace" description="Cleared and ready for the next concept." />
    </div>
  );
}
