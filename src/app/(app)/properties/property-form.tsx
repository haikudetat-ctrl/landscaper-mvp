"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";

import type { Tables } from "@/lib/types/database";
import { FormField, FormRow, checkboxClasses, inputClasses, textareaClasses } from "@/components/ui/forms";
import { SearchSelect } from "@/components/ui/search-select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CreatePropertyFormState } from "@/app/(app)/properties/actions";

type ClientOption = Pick<Tables<"clients">, "id" | "full_name">;
type PropertyDefaultValue = Pick<
  Tables<"properties">,
  | "client_id"
  | "property_name"
  | "street_1"
  | "street_2"
  | "city"
  | "state"
  | "postal_code"
  | "gate_notes"
  | "service_notes"
  | "access_notes"
  | "is_active"
>;

export function PropertyForm({
  action,
  stateAction,
  clients,
  defaultValue,
  initialClientId,
  submitLabel,
  showCreateAndAddPlanButton = false,
  requiredFieldsNote,
  onSuccess,
  resetOnSuccess = false,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  stateAction?: (previousState: CreatePropertyFormState, formData: FormData) => Promise<CreatePropertyFormState>;
  clients: ClientOption[];
  defaultValue?: PropertyDefaultValue;
  initialClientId?: string;
  submitLabel: string;
  showCreateAndAddPlanButton?: boolean;
  requiredFieldsNote?: string;
  onSuccess?: (state: CreatePropertyFormState) => void;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandledCreatedIdRef = useRef<string | null>(null);
  const noStateAction = useCallback(async (previousState: CreatePropertyFormState) => previousState, []);
  const [state, stateFormAction] = useActionState<CreatePropertyFormState, FormData>(stateAction ?? noStateAction, {
    error: null,
    success: null,
    createdId: null,
  });

  useEffect(() => {
    if (!state.createdId || lastHandledCreatedIdRef.current === state.createdId) {
      return;
    }

    lastHandledCreatedIdRef.current = state.createdId;

    if (resetOnSuccess) {
      formRef.current?.reset();
    }

    onSuccess?.(state);
  }, [onSuccess, resetOnSuccess, state]);

  return (
    <form
      ref={formRef}
      action={stateAction ? stateFormAction : action}
      className={`space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ${className ?? ""}`}
    >
      {requiredFieldsNote ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-zinc-700">
          {requiredFieldsNote}
        </p>
      ) : null}

      <FormField label="Client" name="clientId" required>
        <SearchSelect
          name="clientId"
          required
          defaultValue={defaultValue?.client_id ?? initialClientId ?? ""}
          placeholder="Search clients..."
          emptyMessage="No clients match that search."
          options={clients.map((client) => ({
            id: client.id,
            label: client.full_name,
          }))}
        />
      </FormField>

      <FormField label="Property name" name="propertyName">
        <input
          id="propertyName"
          name="propertyName"
          defaultValue={defaultValue?.property_name ?? ""}
          className={inputClasses()}
        />
      </FormField>

      <FormField label="Address line 1" name="addressLine1" required>
        <input
          id="addressLine1"
          name="addressLine1"
          defaultValue={defaultValue?.street_1 ?? ""}
          className={inputClasses()}
          required
        />
      </FormField>

      <FormField label="Address line 2" name="addressLine2">
        <input
          id="addressLine2"
          name="addressLine2"
          defaultValue={defaultValue?.street_2 ?? ""}
          className={inputClasses()}
        />
      </FormField>

      <FormRow>
        <FormField label="City" name="city" required>
          <input id="city" name="city" defaultValue={defaultValue?.city ?? ""} className={inputClasses()} required />
        </FormField>
        <FormField label="State" name="state" required>
          <input id="state" name="state" defaultValue={defaultValue?.state ?? ""} className={inputClasses()} required />
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="ZIP" name="postalCode" required>
          <input
            id="postalCode"
            name="postalCode"
            defaultValue={defaultValue?.postal_code ?? ""}
            className={inputClasses()}
            required
          />
        </FormField>
        <FormField label="Gate/access notes" name="gateNotes">
          <input id="gateNotes" name="gateNotes" defaultValue={defaultValue?.gate_notes ?? ""} className={inputClasses()} />
        </FormField>
      </FormRow>

      <FormField label="Service notes" name="serviceNotes">
        <textarea
          id="serviceNotes"
          name="serviceNotes"
          rows={3}
          defaultValue={defaultValue?.service_notes ?? ""}
          className={textareaClasses()}
        />
      </FormField>

      <FormField label="Access notes" name="accessNotes">
        <textarea
          id="accessNotes"
          name="accessNotes"
          rows={3}
          defaultValue={defaultValue?.access_notes ?? ""}
          className={textareaClasses()}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValue?.is_active ?? true}
          className={checkboxClasses()}
        />
        Property is active
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton label={submitLabel} />
        {showCreateAndAddPlanButton ? (
          <SubmitButton
            label="Create property and add service plan"
            pendingLabel="Creating..."
            name="postCreateAction"
            value="add_service_plan"
            className="border border-emerald-200 bg-white text-zinc-700 hover:bg-emerald-50"
          />
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-zinc-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
