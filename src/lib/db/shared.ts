import type { PostgrestError } from "@supabase/supabase-js";

export function throwDbError(error: PostgrestError | null, context: string): never | void {
  if (!error) return;
  throw new Error(`${context}: ${error.message}`);
}

export function maybeString(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseBoolean(value: FormDataEntryValue | null | undefined): boolean {
  return value === "on" || value === "true";
}

export function parseInteger(value: FormDataEntryValue | null | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseUuid(value: FormDataEntryValue | null | undefined): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Expected a valid id.");
  }

  return value;
}
