import { PageHeader } from "@/components/ui/page-header";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { listTodayRunVisits } from "@/lib/db/today-run";
import { formatCurrencyFromCents, formatDate } from "@/lib/utils/format";
import {
  deriveCanonicalState,
  getPrimaryActionLabel,
  getRevertTarget,
  isReviewState,
  type CanonicalVisitState,
} from "@/lib/workflows/today-visit-workflow";

import {
  addIssueAction,
  advanceVisitAction,
  flagFollowUpAction,
  generateInvoiceDraftAction,
  markPaymentReceivedAction,
  revertVisitStepAction,
  uploadTodayPhotoAction,
} from "./actions";

function statusTone(status: string) {
  if (["completed", "invoice_generated"].includes(status)) return "bg-[#d7e3d4] text-[#1e412d] border-[#93ab92]";
  if (["in_progress", "arrived", "en_route"].includes(status)) return "bg-[#d4ddd8] text-[#20372b] border-[#8ea296]";
  if (["needs_follow_up", "skipped", "cancelled", "blocked_access", "delayed_weather"].includes(status)) {
    return "bg-[#ede4c9] text-[#4d421d] border-[#b7a978]";
  }
  return "bg-[#e2e8e0] text-[#33463a] border-[#a0b19f]";
}

function stopSectionForState(state: CanonicalVisitState) {
  return isReviewState(state) ? "review" : "active";
}

function recurringMessage(query: {
  recurring?: string;
  recurring_reason?: string;
  next_date?: string;
  message?: string;
}) {
  if (query.recurring === "created" && query.next_date) {
    return `Next recurring visit scheduled for ${formatDate(query.next_date)}.`;
  }

  if (query.recurring === "skipped_existing" && query.next_date) {
    return `Next visit already exists for ${formatDate(query.next_date)}.`;
  }

  if (query.recurring === "not_recurring") {
    return query.recurring_reason === "no_service_plan"
      ? "No recurring service plan linked."
      : `No next visit created (${query.recurring_reason?.replaceAll("_", " ") ?? "not recurring"}).`;
  }

  if (query.recurring === "warning") {
    return query.message ?? "Job completed, but next-visit generation needs review.";
  }

  return null;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{
    completed?: string;
    invoice_generated?: string;
    invoice_payment?: string;
    status?: string;
    message?: string;
    visit?: string;
    recurring?: string;
    recurring_reason?: string;
    next_date?: string;
  }>;
}) {
  await requirePagePermission(PERMISSIONS.runView);
  const query = await searchParams;
  const todayData = await listTodayRunVisits();

  const enriched = todayData.visits.map((visit, index) => {
    const workflowState = deriveCanonicalState({
      status: visit.status,
      invoiceStatus: visit.invoice?.status ?? null,
    });

    return {
      ...visit,
      index,
      workflowState,
      section: stopSectionForState(workflowState),
      primaryLabel: getPrimaryActionLabel(workflowState),
      revertTarget: getRevertTarget(workflowState),
      isReview: isReviewState(workflowState),
    };
  });

  const activeStops = enriched.filter((visit) => visit.section === "active");
  const reviewStops = enriched.filter((visit) => visit.section === "review");
  const nextStop = activeStops[0] ?? null;
  const recurrenceBanner = recurringMessage(query);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Today's Run"
        description="Field-ready run flow with one primary next action per stop."
      />
      {query.completed ? (
        <div className="rounded-xl border border-[#9eb29d] bg-[#e5ebe3] px-3 py-2 text-sm text-[#234f34]">
          Job marked completed.
        </div>
      ) : null}
      {query.invoice_generated ? (
        <div className="rounded-xl border border-[#9eb29d] bg-[#e5ebe3] px-3 py-2 text-sm text-[#2d483a]">
          {query.invoice_payment === "skipped_zero_amount"
            ? "Invoice draft created. Expected payment skipped because the invoice amount is $0."
            : "Invoice draft and expected payment created."}
        </div>
      ) : null}
      {query.status ? (
        query.status === "error" ? (
          <div className="rounded-xl border border-[#c9a7a0] bg-[#f3e8e5] px-3 py-2 text-sm text-[#6b3329]">
            {query.message ?? "Action failed. Please retry."}
          </div>
        ) : (
          <div className="rounded-xl border border-[#9eb29d] bg-[#e5ebe3] px-3 py-2 text-sm text-[#234f34]">
            {query.status.replaceAll("_", " ")}.
          </div>
        )
      ) : null}
      {recurrenceBanner ? (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            query.recurring === "warning"
              ? "border-[#c9a7a0] bg-[#f3e8e5] text-[#6b3329]"
              : "border-[#9eb29d] bg-[#e5ebe3] text-[#234f34]"
          }`}
        >
          {recurrenceBanner}
        </div>
      ) : null}

      {enriched.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          No visits scheduled today. Generate visits from service plans or adjust the schedule.
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Route</p>
        <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-4">
          <div>Status: <span className="font-semibold text-zinc-900">{todayData.route?.status?.replaceAll("_", " ") ?? "not created"}</span></div>
          <div>Stops: <span className="font-semibold text-zinc-900">{enriched.length}</span></div>
          <div>Completed / Review: <span className="font-semibold text-zinc-900">{reviewStops.length}</span></div>
          <div>
            Next: <span className="font-semibold text-zinc-900">{nextStop?.properties?.clients?.full_name ?? "Done"}</span>
          </div>
        </div>
      </section>

      {nextStop ? (
      <section className="sticky top-2 z-20 rounded-2xl border border-[#8da295] bg-[#e3e8e4] p-3 text-sm text-[#1f362b] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]">Current / Next Stop</p>
          <p className="mt-1 font-semibold">{nextStop.properties?.clients?.full_name ?? "Unassigned customer"}</p>
          <p className="text-xs">Next action: {nextStop.primaryLabel}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-700">
        Offline mode is not enabled yet. If signal drops, complete the current stop and retry sync when connected.
      </section>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Active Stops</h2>
        <div className="space-y-3">
          {activeStops.map((visit, activeIndex) => {
            const property = visit.properties;
            const client = property?.clients;
            const isCurrent = nextStop?.id === visit.id;
            return (
              <article
                key={visit.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${isCurrent ? "border-blue-300 ring-2 ring-blue-100" : "border-zinc-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Stop {activeIndex + 1}</p>
                    <h2 className="text-base font-semibold text-zinc-900">{client?.full_name ?? "Unassigned customer"}</h2>
                    <p className="text-sm text-zinc-600">
                      {[property?.street_1, property?.city, property?.state, property?.postal_code].filter(Boolean).join(", ") || "No property address"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(visit.workflowState)}`}>
                    {visit.workflowState.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Next action
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-700">
                  <div className="rounded-xl bg-zinc-50 px-3 py-2">Scheduled: {visit.scheduled_date}</div>
                  <div className="rounded-xl bg-zinc-50 px-3 py-2">Price: {formatCurrencyFromCents(visit.quoted_price ?? 0)}</div>
                  <div className="col-span-2 rounded-xl bg-zinc-50 px-3 py-2">
                    {visit.operator_notes ? `Notes: ${visit.operator_notes}` : "No notes yet"}
                  </div>
                </div>

                {visit.workflowState === "completed" ? (
                  <details className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3" open>
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      {visit.primaryLabel}
                    </summary>
                    <form action={generateInvoiceDraftAction.bind(null, visit.id)} className="mt-2 grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="dueDays"
                          type="number"
                          min={0}
                          max={180}
                          defaultValue={14}
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
                        />
                        <select name="paymentMethod" defaultValue="venmo" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm">
                          <option value="venmo">Venmo</option>
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                          <option value="credit_card_placeholder">Credit Card (placeholder)</option>
                        </select>
                      </div>
                  <button className="min-h-12 rounded-lg border border-[#84a083] bg-[#2b6840] px-3 py-2 text-sm font-semibold text-white">
                        Generate Invoice
                      </button>
                    </form>
                  </details>
                ) : (
                  <form action={advanceVisitAction.bind(null, visit.id)} className="mt-3">
                    <button className="min-h-12 w-full rounded-xl border border-zinc-900 bg-zinc-900 px-3 py-3 text-left text-sm font-semibold text-white">
                      {visit.primaryLabel}
                    </button>
                  </form>
                )}

                <details className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Skip ahead</summary>
                  <p className="mt-2 text-xs text-zinc-700">
                    This will auto-apply skipped steps and log implied transition events.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <form action={advanceVisitAction.bind(null, visit.id)}>
                      <input type="hidden" name="targetStatus" value="in_progress" />
                      <button
                        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-left text-xs font-semibold"
                        formAction={advanceVisitAction.bind(null, visit.id)}
                        formMethod="post"
                        title="This will mark Route Started, Arrived, and Work Started."
                      >
                        Jump to Start Work
                      </button>
                    </form>
                    <form action={advanceVisitAction.bind(null, visit.id)}>
                      <input type="hidden" name="targetStatus" value="completed" />
                      <button
                        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-left text-xs font-semibold"
                        title="This will mark Route Started, Arrived, Work Started, and Completed."
                      >
                        Jump to Complete
                      </button>
                    </form>
                  </div>
                </details>

                {visit.revertTarget ? (
                  <details className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Undo last step</summary>
                    <p className="mt-2 text-xs text-zinc-700">
                      Move back to {visit.revertTarget.replaceAll("_", " ")}? Completed stops moved to review once invoiced.
                    </p>
                    <form action={revertVisitStepAction.bind(null, visit.id)} className="mt-2 grid gap-2">
                      <input
                        name="reason"
                        placeholder="Reason (optional)"
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs"
                      />
                      <button className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-left">
                        Move back to {visit.revertTarget.replaceAll("_", " ")}
                      </button>
                    </form>
                  </details>
                ) : null}

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <form action={flagFollowUpAction.bind(null, visit.id)}>
                    <button className="min-h-11 w-full rounded-xl border border-[#b7a978] bg-[#f1ecd8] px-3 py-2 text-left font-semibold text-[#5d4f24]">Flag Follow-Up</button>
                  </form>
                </div>

                {visit.invoice ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <p className="font-semibold text-zinc-900">Invoice</p>
                    <p>Amount: {formatCurrencyFromCents(visit.invoice.amount_due)}</p>
                    <p>Status: {visit.invoice.status}</p>
                    {visit.invoice.payment ? (
                      <>
                        <p>Payment method: {visit.invoice.payment.payment_method ?? "-"}</p>
                        <p>Payment status: {visit.invoice.payment.status ?? "-"}</p>
                        {visit.invoice.payment.status !== "received" && visit.invoice.payment.status !== "reconciled" ? (
                          <form action={markPaymentReceivedAction.bind(null, visit.invoice.payment.id)} className="mt-2 grid grid-cols-2 gap-2">
                            <select name="method" defaultValue={visit.invoice.payment.payment_method ?? "cash"} className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs">
                              <option value="venmo">Venmo</option>
                              <option value="cash">Cash</option>
                              <option value="check">Check</option>
                            </select>
                            <input name="reference" placeholder="Reference" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs" />
                            <button className="col-span-2 min-h-11 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-left text-xs font-semibold">
                              Mark Paid
                            </button>
                          </form>
                        ) : null}
                      </>
                    ) : (
                      <p>No payment expectation yet.</p>
                    )}
                  </div>
                ) : null}

                <details className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">Add Issue</summary>
                  <form action={addIssueAction.bind(null, visit.id)} className="mt-2 space-y-2">
                    <input
                      name="title"
                      required
                      placeholder="Issue title"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
                    />
                    <select name="severity" className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <textarea
                      name="description"
                      placeholder="Details"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
                      rows={2}
                    />
                    <button className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold">Save Issue</button>
                  </form>
                </details>

                <details className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                    Upload Job Photo
                  </summary>
                  <form action={uploadTodayPhotoAction.bind(null, visit.id)} className="mt-2 grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select name="photoType" defaultValue="after" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs">
                        <option value="before">before</option>
                        <option value="after">after</option>
                        <option value="issue">issue</option>
                      </select>
                      <input name="caption" placeholder="Caption" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs" />
                    </div>
                    <input name="photoFile" type="file" accept="image/*" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs" required />
                    <label className="flex items-center gap-2 text-xs text-zinc-700">
                      <input type="checkbox" name="customerVisible" className="h-4 w-4" />
                      Customer visible
                    </label>
                    <button className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold">
                      Upload Photo
                    </button>
                  </form>
                </details>
              </article>
            );
          })}
        </div>
      </div>

      {reviewStops.length ? (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Completed / Review</h2>
          <div className="space-y-3">
            {reviewStops.map((visit, index) => {
              const property = visit.properties;
              const client = property?.clients;
              return (
                <article key={visit.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Review {index + 1}</p>
                      <h2 className="text-base font-semibold text-zinc-900">{client?.full_name ?? "Unassigned customer"}</h2>
                      <p className="text-sm text-zinc-600">
                        {[property?.street_1, property?.city, property?.state, property?.postal_code].filter(Boolean).join(", ") || "No property address"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(visit.workflowState)}`}>
                      {visit.workflowState.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-700">Completed stops moved to review.</p>
                  {visit.revertTarget ? (
                    <form action={revertVisitStepAction.bind(null, visit.id)} className="mt-2 grid gap-2">
                      <input name="reason" placeholder="Reason (optional)" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs" />
                      <button className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-xs font-semibold">
                        Undo last step
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
