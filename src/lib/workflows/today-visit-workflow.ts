export const CANONICAL_SEQUENCE = [
  "scheduled",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
  "invoice_generated",
] as const;

export type CanonicalVisitState = (typeof CANONICAL_SEQUENCE)[number];

export type TransitionEventType =
  | "route_started"
  | "visit_arrived"
  | "work_started"
  | "visit_completed"
  | "invoice_generated";

const TIMESTAMP_BY_STATE: Partial<Record<CanonicalVisitState, string>> = {
  en_route: "route_started_at",
  arrived: "arrived_at",
  in_progress: "work_started_at",
  completed: "completed_at",
  invoice_generated: "invoice_generated_at",
};

const EVENT_BY_STATE: Partial<Record<CanonicalVisitState, TransitionEventType>> = {
  en_route: "route_started",
  arrived: "visit_arrived",
  in_progress: "work_started",
  completed: "visit_completed",
  invoice_generated: "invoice_generated",
};

const PRIMARY_LABEL_BY_STATE: Record<CanonicalVisitState, string> = {
  scheduled: "Start Route",
  en_route: "Mark Arrived",
  arrived: "Start Work",
  in_progress: "Complete Job",
  completed: "Generate Invoice",
  invoice_generated: "Review Job",
};

const REVERT_TARGET_BY_STATE: Partial<Record<CanonicalVisitState, CanonicalVisitState>> = {
  arrived: "en_route",
  in_progress: "arrived",
  completed: "in_progress",
  invoice_generated: "completed",
};

const REVIEW_INVOICE_STATUSES = new Set([
  "generated",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
]);

export function hasGeneratedInvoice(invoiceStatus?: string | null) {
  if (!invoiceStatus) return false;
  return REVIEW_INVOICE_STATUSES.has(invoiceStatus);
}

export function deriveCanonicalState(input: {
  status: string;
  invoiceStatus?: string | null;
}): CanonicalVisitState {
  if (hasGeneratedInvoice(input.invoiceStatus)) return "invoice_generated";
  if (CANONICAL_SEQUENCE.includes(input.status as CanonicalVisitState)) {
    return input.status as CanonicalVisitState;
  }
  return "scheduled";
}

export function getPrimaryActionLabel(state: CanonicalVisitState) {
  return PRIMARY_LABEL_BY_STATE[state];
}

export function getRevertTarget(state: CanonicalVisitState) {
  return REVERT_TARGET_BY_STATE[state] ?? null;
}

export function isReviewState(state: CanonicalVisitState) {
  return state === "invoice_generated";
}

export function isActionableState(state: CanonicalVisitState) {
  return state !== "invoice_generated";
}

export function buildForwardTransitionPlan(input: {
  current: CanonicalVisitState;
  target: CanonicalVisitState;
}) {
  const currentIndex = CANONICAL_SEQUENCE.indexOf(input.current);
  const targetIndex = CANONICAL_SEQUENCE.indexOf(input.target);

  if (currentIndex < 0 || targetIndex < 0) {
    throw new Error("Unknown visit state.");
  }

  if (targetIndex <= currentIndex) {
    throw new Error(`Cannot advance from ${input.current} to ${input.target}.`);
  }

  if (input.target === "invoice_generated") {
    throw new Error("Invoice generation is handled by invoice workflow.");
  }

  const implied = CANONICAL_SEQUENCE.slice(currentIndex + 1, targetIndex + 1).filter(
    (state): state is Exclude<CanonicalVisitState, "invoice_generated"> => state !== "invoice_generated",
  );

  return implied.map((state) => ({
    status: state,
    timestampColumn: TIMESTAMP_BY_STATE[state] ?? null,
    eventType: EVENT_BY_STATE[state] ?? null,
  }));
}

export function buildRevertPlan(input: {
  current: CanonicalVisitState;
  target: CanonicalVisitState;
}) {
  const currentIndex = CANONICAL_SEQUENCE.indexOf(input.current);
  const targetIndex = CANONICAL_SEQUENCE.indexOf(input.target);
  if (targetIndex < 0 || currentIndex < 0 || targetIndex >= currentIndex) {
    throw new Error(`Cannot revert from ${input.current} to ${input.target}.`);
  }

  const rolledBackStates = CANONICAL_SEQUENCE.slice(targetIndex + 1, currentIndex + 1);

  return {
    rolledBackStates,
    clearFields: rolledBackStates
      .map((state) => TIMESTAMP_BY_STATE[state])
      .filter((value): value is string => Boolean(value)),
  };
}
