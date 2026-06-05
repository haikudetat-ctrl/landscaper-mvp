import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { FormField, inputClasses, selectClasses, textareaClasses } from "@/components/ui/forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { getServiceVisitById } from "@/lib/db/service-visits";
import { listScheduleFormOptions } from "@/lib/db/schedule";
import { visitStatuses } from "@/lib/utils/constants";

import { updateVisitAction } from "@/app/(app)/service-visits/actions";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function EditVisitPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission(PERMISSIONS.serviceVisitsRead);
  const { id } = await params;
  const [visit, formOptions] = await Promise.all([getServiceVisitById(id), listScheduleFormOptions()]);

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

        <FormField label="Property" name="propertyId" required>
          <select id="propertyId" name="propertyId" defaultValue={visit.property_id ?? ""} className={selectClasses()} required>
            {formOptions.properties.map((option: { id: string; street_1: string | null; city: string | null; state: string | null }) => (
              <option key={option.id} value={option.id}>
                {[option.street_1, option.city, option.state].filter(Boolean).join(", ")}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Service Type" name="serviceTypeId" required>
          <select id="serviceTypeId" name="serviceTypeId" defaultValue={visit.service_type_id ?? ""} className={selectClasses()} required>
            {formOptions.serviceTypes.map((option: { id: string; label: string }) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Service Plan" name="servicePlanId">
          <select id="servicePlanId" name="servicePlanId" defaultValue={visit.service_plan_id ?? ""} className={selectClasses()}>
            <option value="">No linked plan</option>
            {formOptions.servicePlans.map((option: { id: string; plan_name: string | null }) => (
              <option key={option.id} value={option.id}>
                {option.plan_name ?? option.id}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Price (cents)" name="quotedPrice">
          <input id="quotedPrice" name="quotedPrice" type="number" min={0} defaultValue={visit.quoted_price ?? 0} className={inputClasses()} />
        </FormField>

        <FormField label="Notes" name="notes">
          <textarea id="notes" name="notes" rows={4} defaultValue={visit.operator_notes ?? ""} className={textareaClasses()} />
        </FormField>

        <SubmitButton label="Save changes" />
      </form>
    </div>
  );
}
