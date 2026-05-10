import { DailyRunShell } from "@/components/daily-run/daily-run-shell";
import { ActionCard, JobCard, mapVisitToJobCardData } from "@/components/cards";
import { PageHeader } from "@/components/ui/page-header";
import { getDailyRunData } from "@/lib/db/daily-run";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function RunPage() {
  await requirePagePermission(PERMISSIONS.runView);
  const data = await getDailyRunData();

  return (
    <div className="-mx-4 -mt-5 md:mx-0 md:mt-0">
      <div className="hidden md:block">
        <PageHeader
          title="Daily Run"
          description="Mobile-first command center for confirming, routing, completing, and collecting today's work."
        />
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          {data.visits[0] ? (
            <JobCard
              job={mapVisitToJobCardData(data.visits[0])}
              variant={data.visits[0].visit_status === "completed" ? "completed" : "active"}
              primaryAction={{ label: "Start Active Job" }}
              secondaryAction={{ label: "Open in Run" }}
            />
          ) : null}
          <ActionCard
            title="Mark Job Complete"
            description="Use the run flow below to complete, skip, and collect without losing sequence."
            ctaLabel="Use Run Controls"
            variant="secondary"
          />
        </div>
      </div>
      <DailyRunShell data={data} />
    </div>
  );
}
