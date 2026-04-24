import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { FormField, inputClasses, selectClasses, textareaClasses } from "@/components/ui/forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { getServiceVisitById } from "@/lib/db/service-visits";
import { visitStatuses } from "@/lib/utils/constants";

import { updateVisitAction } from "@/app/(app)/service-visits/actions";

export default async function EditVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visit = await getServiceVisitById(id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Visit"
        description="Update schedule, status, or notes."
        actions={<LinkButton href={`/service-visits/${id}`} label="Back to visit" tone="secondary" />}
      />

      <form action={updateVisitAction.bind(null, id)} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <FormField label="Scheduled date" name="scheduledDate" required>
          <input
            id="scheduledDate"
            name="scheduledDate"
            type="date"
            defaultValue={visit.scheduled_date}
            className={inputClasses()}
            required
          />
        </FormField>

        <FormField label="Status" name="status" required>
          <select id="status" name="status" defaultValue={visit.status ?? "scheduled"} className={selectClasses()} required>
            {visitStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Notes" name="notes">
          <textarea id="notes" name="notes" rows={4} defaultValue={visit.operator_notes ?? ""} className={textareaClasses()} />
        </FormField>

        <SubmitButton label="Save changes" />
      </form>
    </div>
  );
}
