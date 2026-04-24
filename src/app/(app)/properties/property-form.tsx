import type { Tables } from "@/lib/types/database";
import { FormField, FormRow, checkboxClasses, inputClasses, selectClasses, textareaClasses } from "@/components/ui/forms";
import { SubmitButton } from "@/components/ui/submit-button";

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
  clients,
  defaultValue,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  clients: ClientOption[];
  defaultValue?: PropertyDefaultValue;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <FormField label="Client" name="clientId" required>
        <select id="clientId" name="clientId" defaultValue={defaultValue?.client_id ?? ""} className={selectClasses()} required>
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.full_name}
            </option>
          ))}
        </select>
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
        <FormField label="City" name="city">
          <input id="city" name="city" defaultValue={defaultValue?.city ?? ""} className={inputClasses()} />
        </FormField>
        <FormField label="State" name="state">
          <input id="state" name="state" defaultValue={defaultValue?.state ?? ""} className={inputClasses()} />
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="ZIP" name="postalCode">
          <input
            id="postalCode"
            name="postalCode"
            defaultValue={defaultValue?.postal_code ?? ""}
            className={inputClasses()}
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

      <SubmitButton label={submitLabel} />
    </form>
  );
}
