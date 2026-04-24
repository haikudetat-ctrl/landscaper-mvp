"use client";

import { useActionState, useCallback } from "react";

import type { Tables } from "@/lib/types/database";
import { planFrequencies, planStatuses } from "@/lib/utils/constants";
import { formatAddress } from "@/lib/utils/format";

import { FormField, FormRow, inputClasses, selectClasses, textareaClasses } from "@/components/ui/forms";
import { SubmitButton } from "@/components/ui/submit-button";

type PropertyOption = Pick<
  Tables<"properties">,
  "id" | "street_1" | "city" | "state" | "postal_code"
>;

type ServiceTypeOption = Pick<Tables<"service_types">, "id" | "label">;
type ServicePlanDefaultValue = Pick<
  Tables<"service_plans">,
  | "property_id"
  | "service_type_id"
  | "plan_name"
  | "frequency_type"
  | "status"
  | "day_of_week"
  | "interval_count"
  | "start_date"
  | "end_date"
  | "quoted_price"
  | "notes"
>;

type FormState = { error: string | null };

export function ServicePlanForm({
  action,
  stateAction,
  properties,
  serviceTypes,
  defaultValue,
  initialPropertyId,
  submitLabel,
  requiredFieldsNote,
}: {
  action: (formData: FormData) => Promise<void>;
  stateAction?: (previousState: FormState, formData: FormData) => Promise<FormState>;
  properties: PropertyOption[];
  serviceTypes: ServiceTypeOption[];
  defaultValue?: ServicePlanDefaultValue;
  initialPropertyId?: string;
  submitLabel: string;
  requiredFieldsNote?: string;
}) {
  const noStateAction = useCallback(async (previousState: FormState) => previousState, []);
  const [state, stateFormAction] = useActionState<FormState, FormData>(stateAction ?? noStateAction, {
    error: null,
  });

  return (
    <form action={stateAction ? stateFormAction : action} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      {requiredFieldsNote ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-zinc-700">
          {requiredFieldsNote}
        </p>
      ) : null}

      <FormField label="Property" name="propertyId" required>
        <select
          id="propertyId"
          name="propertyId"
          defaultValue={defaultValue?.property_id ?? initialPropertyId ?? ""}
          className={selectClasses()}
          required
        >
          <option value="">Select property</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {formatAddress(property)}
            </option>
          ))}
        </select>
      </FormField>

      <FormRow>
        <FormField label="Plan name" name="name" required>
          <input id="name" name="name" defaultValue={defaultValue?.plan_name ?? ""} className={inputClasses()} required />
        </FormField>
        <FormField label="Service type" name="serviceTypeId" required>
          <select id="serviceTypeId" name="serviceTypeId" defaultValue={defaultValue?.service_type_id ?? ""} className={selectClasses()} required>
            <option value="">Select service type</option>
            {serviceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="Frequency" name="frequency" required>
          <select
            id="frequency"
            name="frequency"
            defaultValue={(defaultValue?.frequency_type ?? "weekly").replace("custom_interval", "custom-interval")}
            className={selectClasses()}
            required
          >
            {planFrequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequency}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Status" name="status" required>
          <select id="status" name="status" defaultValue={defaultValue?.status ?? "active"} className={selectClasses()} required>
            {planStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="Day of week" name="dayOfWeek" hint="0 = Sunday, 6 = Saturday">
          <input
            id="dayOfWeek"
            name="dayOfWeek"
            type="number"
            min={0}
            max={6}
            defaultValue={defaultValue?.day_of_week ?? ""}
            className={inputClasses()}
          />
        </FormField>

        <FormField label="Custom interval (days)" name="intervalDays">
          <input
            id="intervalDays"
            name="intervalDays"
            type="number"
            min={1}
            defaultValue={defaultValue?.interval_count ?? ""}
            className={inputClasses()}
          />
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="Start date" name="startDate" required>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaultValue?.start_date ?? ""}
            className={inputClasses()}
            required
          />
        </FormField>
        <FormField label="End date" name="endDate">
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaultValue?.end_date ?? ""}
            className={inputClasses()}
          />
        </FormField>
      </FormRow>

      <FormField label="Quoted price" name="quotedPrice" required>
        <input
          id="quotedPrice"
          name="quotedPrice"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValue?.quoted_price ?? 0}
          className={inputClasses()}
          required
        />
      </FormField>

      <FormField label="Notes" name="notes">
        <textarea id="notes" name="notes" rows={3} defaultValue={defaultValue?.notes ?? ""} className={textareaClasses()} />
      </FormField>

      <SubmitButton label={submitLabel} />

      {state.error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-zinc-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
