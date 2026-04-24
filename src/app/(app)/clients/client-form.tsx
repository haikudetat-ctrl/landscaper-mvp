import type { Tables } from "@/lib/types/database";

import { FormField, FormRow, checkboxClasses, inputClasses, textareaClasses } from "@/components/ui/forms";
import { SubmitButton } from "@/components/ui/submit-button";

export function ClientForm({
  action,
  defaultValue,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValue?: Tables<"clients">;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
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

      <SubmitButton label={submitLabel} />
    </form>
  );
}
