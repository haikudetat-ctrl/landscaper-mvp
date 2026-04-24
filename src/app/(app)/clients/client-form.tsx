"use client";

import { useActionState, useCallback, useState } from "react";

import type { Tables } from "@/lib/types/database";

import { FormField, FormRow, checkboxClasses, inputClasses, textareaClasses } from "@/components/ui/forms";
import { SubmitButton } from "@/components/ui/submit-button";

type FormState = { error: string | null };

export function ClientForm({
  action,
  stateAction,
  defaultValue,
  submitLabel,
  showCreateAndAddPropertyButton = false,
  requiredFieldsNote,
}: {
  action: (formData: FormData) => Promise<void>;
  stateAction?: (previousState: FormState, formData: FormData) => Promise<FormState>;
  defaultValue?: Tables<"clients">;
  submitLabel: string;
  showCreateAndAddPropertyButton?: boolean;
  requiredFieldsNote?: string;
}) {
  const [clientNameError, setClientNameError] = useState<string | null>(null);
  const noStateAction = useCallback(async (previousState: FormState) => previousState, []);
  const [state, stateFormAction] = useActionState<FormState, FormData>(stateAction ?? noStateAction, {
    error: null,
  });

  return (
    <form
      action={stateAction ? stateFormAction : action}
      onSubmit={(event) => {
        setClientNameError(null);
        const form = event.currentTarget;
        const firstName = ((form.elements.namedItem("firstName") as HTMLInputElement | null)?.value ?? "").trim();
        const lastName = ((form.elements.namedItem("lastName") as HTMLInputElement | null)?.value ?? "").trim();
        const businessName = ((form.elements.namedItem("businessName") as HTMLInputElement | null)?.value ?? "").trim();

        if (!businessName && (!firstName || !lastName)) {
          event.preventDefault();
          setClientNameError("Provide Client display name or both first and last name.");
        }
      }}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {requiredFieldsNote ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-zinc-700">
          {requiredFieldsNote}
        </p>
      ) : null}

      <FormRow>
        <FormField label="First name" name="firstName">
          <input id="firstName" name="firstName" defaultValue="" className={inputClasses()} />
        </FormField>
        <FormField label="Last name" name="lastName">
          <input id="lastName" name="lastName" defaultValue="" className={inputClasses()} />
        </FormField>
      </FormRow>

      <FormField label="Client display name" name="businessName" hint="Used if first/last is not entered.">
        <input id="businessName" name="businessName" defaultValue={defaultValue?.full_name ?? ""} className={inputClasses()} />
      </FormField>

      <FormRow>
        <FormField label="Email" name="email">
          <input id="email" name="email" type="email" defaultValue={defaultValue?.primary_email ?? ""} className={inputClasses()} />
        </FormField>
        <FormField label="Phone" name="phone">
          <input id="phone" name="phone" defaultValue={defaultValue?.primary_phone ?? ""} className={inputClasses()} />
        </FormField>
      </FormRow>

      <FormField label="Billing notes" name="billingAddress">
        <input
          id="billingAddress"
          name="billingAddress"
          defaultValue={defaultValue?.billing_notes ?? ""}
          className={inputClasses()}
        />
      </FormField>

      <FormField label="Cash/check notes" name="notes">
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValue?.cash_collection_notes ?? ""}
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
        Client is active
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton label={submitLabel} />
        {showCreateAndAddPropertyButton ? (
          <SubmitButton
            label="Create client and add property"
            pendingLabel="Creating..."
            name="postCreateAction"
            value="add_property"
            className="border border-emerald-200 bg-white text-zinc-700 hover:bg-emerald-50"
          />
        ) : null}
      </div>

      {clientNameError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-zinc-700">
          {clientNameError}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-zinc-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
