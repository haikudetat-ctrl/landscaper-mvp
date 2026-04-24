export const planFrequencies = [
  "weekly",
  "biweekly",
  "one-time",
  "seasonal",
  "custom-interval",
] as const;

export const planStatuses = ["active", "paused", "inactive"] as const;

export const visitStatuses = [
  "scheduled",
  "completed",
  "skipped",
  "rescheduled",
  "canceled",
  "pending_reactivation",
] as const;

export const paymentMethods = ["venmo", "cash", "check", "other"] as const;

export const communicationChannels = ["sms", "email", "phone", "other"] as const;

export const communicationStatuses = ["queued", "sent", "failed", "logged"] as const;
