import { ActionCard, AlertCard, ClientCard, InvoiceCard, JobCard, MetricCard, PropertyCard } from "@/components/cards";
import { EmptyStateCard } from "@/components/empty-states/empty-state-card";
import { StatusCard } from "@/components/status/status-card";
import { StatusPill, type OpsStatus } from "@/components/status/status-pill";
import { PageHeader } from "@/components/ui/page-header";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

const statuses: OpsStatus[] = ["scheduled", "completed", "skipped", "overdue", "paused", "needs_review"];

const demoJob = {
  clientName: "Riley Landscaping HQ",
  propertyAddress: "124 Cedar Ln • Cherry Hill, NJ 08002",
  serviceType: "Weekly Mow + Trim",
  scheduledDate: "2026-05-04",
  scheduledWindow: "8:00 AM - 10:00 AM",
  status: "scheduled" as const,
  price: 1240,
  notes: "Side gate code missing. Confirm access before arrival.",
  photos: 3,
  assignedCrew: "Crew A",
};

export default async function UiKitPage() {
  await requirePagePermission(PERMISSIONS.supportAdmin);

  return (
    <div className="space-y-6">
      <PageHeader title="UI Kit" description="Reusable field-ops card system" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Status Pills</h2>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <StatusPill key={status} status={status} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statuses.map((status) => (
            <StatusCard key={`status-card-${status}`} status={status} helperText="Reusable status treatment" />
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Jobs Today" value="12" delta="+2 vs yesterday" deltaDirection="up" />
        <MetricCard label="Scheduled Revenue" value="$1,240" delta="-8% week-over-week" deltaDirection="down" />
        <MetricCard label="Overdue Invoices" value="3" delta="Needs follow-up" deltaDirection="down" />
        <MetricCard label="Completion Rate" value="84%" helperText="Crew average this week" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard title="Start Today's Run" description="Open route operations" ctaLabel="Start" />
        <ActionCard title="Generate Route" description="Optimize stop order" ctaLabel="Generate" variant="secondary" />
        <ActionCard title="Send Confirmations" description="Tomorrow reminders" ctaLabel="Send" variant="warning" />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <JobCard job={demoJob} variant="compact" />
        <JobCard job={demoJob} variant="expanded" primaryAction={{ label: "Start Job" }} secondaryAction={{ label: "Open Map" }} />
        <JobCard job={{ ...demoJob, status: "completed" }} variant="completed" />
        <JobCard job={{ ...demoJob, status: "needs_review" }} variant="problem" />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <ClientCard
          client={{
            name: "Morgan Lee",
            phone: "(555) 123-4567",
            email: "morgan@example.com",
            address: "64 Birch Dr • Haddonfield, NJ",
            balance: 380,
            status: "overdue",
            paymentPreference: "Check",
            lastServiceDate: "2026-04-30",
            nextServiceDate: "2026-05-07",
          }}
          variant="expanded"
        />
        <PropertyCard
          property={{
            address: "92 Willow Ave • Collingswood, NJ",
            clientName: "Morgan Lee",
            accessNotes: "Gate keypad on left post",
            propertyNotes: "Avoid flower beds in front corner",
            status: "scheduled",
          }}
          variant="expanded"
        />
        <InvoiceCard
          invoice={{
            invoiceNumber: "INV-1082",
            clientName: "Morgan Lee",
            amount: 380,
            dueDate: "2026-05-10",
            status: "overdue",
            paymentMethod: "Check",
            relatedJobs: ["Mow", "Edge"],
          }}
          variant="expanded"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <AlertCard variant="warning" title="Rain expected today" description="Potential route delay after 2PM." ctaLabel="Adjust schedule" />
        <AlertCard variant="danger" title="Gate code missing" description="Elm Street stop has no access instructions." ctaLabel="Request details" />
        <AlertCard variant="info" title="Route not generated" description="Create sequence before dispatching crew." ctaLabel="Generate route" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <EmptyStateCard
          icon={<span>0</span>}
          headline="No jobs scheduled today"
          helperText="Create a plan or generate visits to populate the run."
          ctaLabel="Create job"
        />
        <EmptyStateCard
          icon={<span>0</span>}
          headline="No photos uploaded"
          helperText="Crew snapshots will appear here for quality tracking."
        />
      </section>
    </div>
  );
}
