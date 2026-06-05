export const planFrequencies = [
  "weekly",
  "biweekly",
  "monthly",
  "one-time",
  "seasonal",
  "custom-interval",
] as const;

export const planStatuses = ["active", "paused", "inactive"] as const;

export const visitStatuses = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "skipped",
  "rescheduled",
  "paused",
  "needs_review",
  "canceled",
  "pending_reactivation",
] as const;

export const VISIT_STATUSES = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "skipped",
  "rescheduled",
  "paused",
  "needs_review",
] as const;

export const APP_EVENT_TYPES = [
  "visit_scheduled",
  "visit_confirmed",
  "visit_started",
  "visit_completed",
  "visit_skipped",
  "visit_rescheduled",
  "visit_paused",
  "visit_needs_review",
  "photo_uploaded",
  "invoice_created",
  "invoice_sent",
  "payment_recorded",
  "route_generated",
  "route_started",
  "route_completed",
] as const;

export const paymentMethods = ["venmo", "cash", "check", "other"] as const;

export const communicationChannels = ["sms", "email", "phone", "other"] as const;

export const communicationStatuses = ["queued", "sent", "failed", "logged"] as const;
