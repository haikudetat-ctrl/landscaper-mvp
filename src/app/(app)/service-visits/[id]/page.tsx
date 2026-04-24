import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FormField, inputClasses, selectClasses, textareaClasses } from "@/components/ui/forms";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataTable, Td, Th } from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listVisitPhotos } from "@/lib/db/photos";
import { getInvoiceByServiceVisitId, getServiceVisitById } from "@/lib/db/service-visits";
import { formatAddress, formatCurrencyFromCents, formatDate, formatDateTime } from "@/lib/utils/format";

import { createInvoiceFromVisitAction } from "@/app/(app)/invoices/actions";
import {
  completeVisitAction,
  markPendingReactivationAction,
  rescheduleVisitAction,
  setVisitInvoiceAmountAction,
  skipVisitAction,
  uploadVisitPhotoAction,
} from "@/app/(app)/service-visits/actions";

export default async function ServiceVisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visit = await getServiceVisitById(id);
  const photos = await listVisitPhotos(id);
  const invoice = await getInvoiceByServiceVisitId(id);

  const supabase = createSupabaseServerClient();
  const commResult = await supabase
    .from("communication_log")
    .select("id, message_type, channel, recipient, status, sent_at, created_at")
    .eq("service_visit_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const communications = commResult.data ?? [];
  const property = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
  const client = property
    ? Array.isArray(property.clients)
      ? property.clients[0]
      : property.clients
    : null;
  const serviceType = Array.isArray(visit.service_types) ? visit.service_types[0] : visit.service_types;
  const servicePlan = Array.isArray(visit.service_plans) ? visit.service_plans[0] : visit.service_plans;

  const isCompleted = visit.status === "completed";
  const hasInvoice = Boolean(invoice?.id);
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHeader
        title={formatAddress(property ?? {})}
        description={`Visit scheduled for ${formatDate(visit.scheduled_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <LinkButton href="/service-visits" label="Back to visits" tone="secondary" />
            <LinkButton href={`/service-visits/${id}/edit`} label="Edit visit" tone="secondary" />
          </div>
        }
      />

      <section className="grid grid-cols-3 gap-2 md:hidden">
        <a href="#visit-actions" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-xs font-medium text-zinc-800">
          Actions
        </a>
        <a href="#visit-photos" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-xs font-medium text-zinc-800">
          Photos
        </a>
        <a href="#visit-invoice" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-xs font-medium text-zinc-800">
          Invoice
        </a>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <SectionCard title="Status">
          <StatusPill status={visit.status} />
        </SectionCard>
        <SectionCard title="Service">
          <p>{serviceType?.label ?? "-"}</p>
          <p className="text-sm text-zinc-600">Plan: {servicePlan?.plan_name ?? "-"}</p>
        </SectionCard>
        <SectionCard title="Client">
          <p>{client?.full_name ?? "No client"}</p>
          <p className="text-sm text-zinc-600">{client?.primary_phone ?? "No phone"}</p>
        </SectionCard>
        <SectionCard title="Visit Value">
          <p className="text-2xl font-semibold">{formatCurrencyFromCents(visit.quoted_price)}</p>
        </SectionCard>
      </section>

      <section id="visit-actions" className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Mark Completed">
          <p className="mb-3 text-sm text-zinc-600">Set this visit to completed for billing workflow.</p>
          <form action={completeVisitAction.bind(null, id)}>
            <SubmitButton label="Mark completed" pendingLabel="Updating..." />
          </form>
        </SectionCard>

        <SectionCard title="Skip Visit">
          <form action={skipVisitAction.bind(null, id)} className="space-y-3">
            <FormField label="Skip reason" name="skippedReason" required>
              <input id="skippedReason" name="skippedReason" className={inputClasses()} required />
            </FormField>
            <FormField label="Note" name="skipNote">
              <textarea id="skipNote" name="skipNote" rows={2} className={textareaClasses()} />
            </FormField>
            <SubmitButton label="Mark skipped" pendingLabel="Updating..." />
          </form>
        </SectionCard>

        <SectionCard title="Reschedule Visit">
          <form action={rescheduleVisitAction.bind(null, id)} className="space-y-3">
            <FormField label="New date" name="scheduledDate" required>
              <input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                defaultValue={visit.scheduled_date}
                className={inputClasses()}
                required
              />
            </FormField>
            <FormField label="Notes" name="notes">
              <textarea id="notes" name="notes" rows={2} defaultValue={visit.operator_notes ?? ""} className={textareaClasses()} />
            </FormField>
            <SubmitButton label="Reschedule" pendingLabel="Updating..." />
          </form>
        </SectionCard>

        <SectionCard title="Pending Reactivation">
          <p className="mb-3 text-sm text-zinc-600">Use this when skipped work needs manual follow-up scheduling.</p>
          <form action={markPendingReactivationAction.bind(null, id)}>
            <SubmitButton label="Set pending reactivation" pendingLabel="Updating..." />
          </form>
        </SectionCard>
      </section>

      <section id="visit-invoice" className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Visit Price Override">
          <form action={setVisitInvoiceAmountAction.bind(null, id)} className="space-y-3">
            <FormField label="Price cents" name="priceCents" required>
              <input
                id="priceCents"
                name="priceCents"
                type="number"
                min={0}
                step="0.01"
                defaultValue={visit.quoted_price ?? 0}
                className={inputClasses()}
                required
              />
            </FormField>
            <SubmitButton label="Save price" pendingLabel="Saving..." />
          </form>
        </SectionCard>

        <SectionCard title="Invoice Action">
          {hasInvoice ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-600">This visit is linked to invoice #{invoice?.invoice_number ?? "-"}.</p>
              <Link href={`/invoices/${invoice?.id}`} className="inline-block rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
                Open invoice
              </Link>
            </div>
          ) : isCompleted ? (
            <form action={createInvoiceFromVisitAction.bind(null, id)} className="space-y-3">
              <FormField label="Due in days" name="dueDays">
                <input id="dueDays" name="dueDays" type="number" min={0} max={180} defaultValue={14} className={inputClasses()} />
              </FormField>
              <SubmitButton label="Create invoice from visit" pendingLabel="Creating..." />
            </form>
          ) : (
            <p className="text-sm text-zinc-600">Complete the visit before creating an invoice.</p>
          )}
        </SectionCard>
      </section>

      <SectionCard title="Visit Photos">
        <div id="visit-photos" className="h-0 w-0 overflow-hidden" />
        <form action={uploadVisitPhotoAction.bind(null, id)} className="grid gap-3 border-b border-zinc-200 pb-4 md:grid-cols-4 md:items-end">
          <FormField label="Photo type" name="photoType" required>
            <select id="photoType" name="photoType" defaultValue="after" className={selectClasses()} required>
              <option value="before">before</option>
              <option value="after">after</option>
              <option value="issue">issue</option>
            </select>
          </FormField>
          <FormField label="Caption" name="caption">
            <input id="caption" name="caption" className={inputClasses()} />
          </FormField>
          <FormField label="File" name="photoFile" required>
            <input id="photoFile" name="photoFile" type="file" accept="image/*" className={inputClasses()} required />
          </FormField>
          <SubmitButton label="Upload photo" pendingLabel="Uploading..." />
        </form>

        {photos.length === 0 ? (
          <div className="pt-4">
            <EmptyState title="No photos uploaded yet" />
          </div>
        ) : (
          <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                {photo.signedUrl ? (
                  <>
                    {/* Signed URLs are already transformed by Supabase Storage; plain img keeps this flow simple for MVP. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.signedUrl} alt={photo.caption ?? "Visit photo"} className="h-44 w-full object-cover sm:h-48" />
                  </>
                ) : (
                  <div className="flex h-44 items-center justify-center text-sm text-zinc-500 sm:h-48">Preview unavailable</div>
                )}
                <figcaption className="p-2 text-xs text-zinc-700">
                  <div className="font-medium">{photo.photo_type ?? "photo"}</div>
                  <div>{photo.caption ?? "-"}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Communication History">
        {communications.length === 0 ? (
          <EmptyState title="No communication logs tied to this visit" />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {communications.map((entry) => (
                <div key={entry.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-700">{entry.message_type ?? "-"}</p>
                    <StatusPill status={entry.status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{entry.channel ?? "-"} • {entry.recipient ?? "-"}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatDateTime(entry.sent_at ?? entry.created_at ?? defaultDate)}</p>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Type</Th>
                    <Th>Channel</Th>
                    <Th>Recipient</Th>
                    <Th>Status</Th>
                    <Th>Timestamp</Th>
                  </tr>
                </thead>
                <tbody>
                  {communications.map((entry) => (
                    <tr key={entry.id} className="border-t border-zinc-200">
                      <Td>{entry.message_type ?? "-"}</Td>
                      <Td>{entry.channel ?? "-"}</Td>
                      <Td>{entry.recipient ?? "-"}</Td>
                      <Td>
                        <StatusPill status={entry.status} />
                      </Td>
                      <Td>{formatDateTime(entry.sent_at ?? entry.created_at ?? defaultDate)}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
