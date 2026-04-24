function parseDateValue(value: string): Date {
  // Date-only DB values (YYYY-MM-DD) should be treated as local calendar dates,
  // not UTC midnights, otherwise US timezones can render one day behind.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
  }

  return new Date(value);
}

export function formatCurrencyFromCents(cents: number | null | undefined): string {
  if (typeof cents !== "number") {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";

  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";

  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatAddress(record: {
  street_1?: string | null;
  street_2?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}): string {
  const lineOne = [record.street_1 ?? record.address_line_1, record.street_2 ?? record.address_line_2]
    .filter(Boolean)
    .join(" ");
  const lineTwo = [record.city, record.state, record.postal_code].filter(Boolean).join(", ").replace(", ,", ",");

  return [lineOne, lineTwo].filter(Boolean).join(" • ") || "Address missing";
}

export function formatClientName(record: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  business_name?: string | null;
  client_name?: string | null;
}): string {
  if (record.full_name) return record.full_name;
  if (record.client_name) return record.client_name;
  if (record.business_name) return record.business_name;

  const fullName = [record.first_name, record.last_name].filter(Boolean).join(" ").trim();
  return fullName || "Unnamed client";
}
