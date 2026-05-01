import { DailyRunShell } from "@/components/daily-run/daily-run-shell";
import { PageHeader } from "@/components/ui/page-header";
import { getDailyRunData } from "@/lib/db/daily-run";

export default async function RunPage() {
  const data = await getDailyRunData();

  return (
    <div className="-mx-4 -mt-5 md:mx-0 md:mt-0">
      <div className="hidden md:block">
        <PageHeader
          title="Daily Run"
          description="Mobile-first command center for confirming, routing, completing, and collecting today's work."
        />
      </div>
      <DailyRunShell data={data} />
    </div>
  );
}
