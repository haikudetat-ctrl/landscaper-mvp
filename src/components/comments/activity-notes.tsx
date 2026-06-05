import { Button } from "@/components/ui/button";
import { textareaClasses } from "@/components/ui/forms";
import { deleteCommentAction, updateCommentAction, createCommentAction } from "@/app/(app)/comments/actions";
import type { OperationalComment } from "@/lib/db/comments";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import type { CommentEntityType } from "@/lib/validation/comment";

export type ActivityEventItem = {
  id: string;
  event_type: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  actor_name?: string | null;
};

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataText(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return null;

  const note = typeof metadata.note === "string" ? metadata.note : null;
  const reason = typeof metadata.reason === "string" ? metadata.reason : null;
  const scheduledDate = typeof metadata.scheduled_date === "string" ? metadata.scheduled_date : null;
  const error = typeof metadata.error === "string" ? metadata.error : null;

  if (note) return note;
  if (reason) return reason;
  if (scheduledDate) return `Scheduled for ${formatDate(scheduledDate)}`;
  if (error) return error;
  return null;
}

function eventCopy(eventType: string, metadata?: Record<string, unknown> | null) {
  switch (eventType) {
    case "lead_claimed":
      return { title: "Lead connected to your company", detail: "This lead is now available for the team to work." };
    case "lead_stage_changed":
    case "lead_status_changed":
      return { title: "Lead stage changed", detail: metadataText(metadata) };
    case "lead_site_visit_scheduled":
      return { title: "Site visit scheduled", detail: metadataText(metadata) };
    case "lead_communication_logged":
      return { title: "Customer communication logged", detail: metadataText(metadata) };
    case "lead_converted_won":
      return { title: "Lead won and converted", detail: "Client and property records were created or linked." };
    case "lead_marked_lost":
      return { title: "Lead marked lost", detail: metadataText(metadata) };
    case "visit_completed":
      return { title: "Visit marked complete", detail: "The job was finished and moved into follow-up workflow." };
    case "visit_skipped":
      return { title: "Visit skipped", detail: metadataText(metadata) };
    case "visit_rescheduled":
      return { title: "Visit rescheduled", detail: metadataText(metadata) };
    case "visit_pending_reactivation":
      return { title: "Visit needs reactivation", detail: "This skipped work needs a manual follow-up date." };
    case "invoice_generated":
      return { title: "Invoice created", detail: metadataText(metadata) };
    case "payment_received":
      return { title: "Payment recorded", detail: metadataText(metadata) };
    case "recurring_visit_created":
      return { title: "Next recurring visit created", detail: metadataText(metadata) };
    case "recurring_visit_generation_failed":
      return { title: "Recurring visit needs review", detail: metadataText(metadata) };
    default:
      return { title: titleCase(eventType), detail: metadataText(metadata) };
  }
}

export function ActivityNotes({
  entityType,
  entityId,
  returnPath,
  comments,
  events = [],
  currentUserId,
  placeholder = "Add a note for the team",
  emptyMessage = "No activity or notes yet.",
}: {
  entityType: CommentEntityType;
  entityId: string;
  returnPath: string;
  comments: OperationalComment[];
  events?: ActivityEventItem[];
  currentUserId: string;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const items = [
    ...comments.map((comment) => ({
      id: comment.id,
      kind: "comment" as const,
      title: comment.author_name,
      detail: comment.body,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      actorName: comment.author_name,
      canManage: comment.author_user_id === currentUserId,
      comment,
    })),
    ...events.map((event) => {
      const copy = eventCopy(event.event_type, event.metadata);
      return {
        id: event.id,
        kind: "event" as const,
        title: copy.title,
        detail: copy.detail,
        createdAt: event.created_at,
        updatedAt: event.created_at,
        actorName: event.actor_name ?? "System",
        canManage: false,
        comment: null,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <form
        action={createCommentAction.bind(null, entityType, entityId, returnPath)}
        className="rounded-xl border border-[#d4ddd2] bg-white p-3"
      >
        <label htmlFor={`comment-${entityType}-${entityId}`} className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Add note
        </label>
        <textarea
          id={`comment-${entityType}-${entityId}`}
          name="body"
          rows={3}
          placeholder={placeholder}
          required
          className={`${textareaClasses()} mt-2`}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" className="min-h-10 rounded-md px-3 py-2">
            Add note
          </Button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#d4ddd2] bg-white px-3 py-6 text-center text-sm text-zinc-600">
          {emptyMessage}
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="rounded-xl border border-[#d4ddd2] bg-white px-3 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#d4ddd2] bg-[#f6f8f4] px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      {item.kind === "comment" ? "Note" : "Activity"}
                    </span>
                    <span className="rounded-full border border-[#d4ddd2] bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      by {item.actorName}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-zinc-500">{formatDateTime(item.createdAt)}</p>
              </div>

              {item.detail ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">{item.detail}</p>
              ) : null}

              {item.kind === "comment" && item.updatedAt !== item.createdAt ? (
                <p className="mt-1 text-xs text-zinc-500">Edited {formatDateTime(item.updatedAt)}</p>
              ) : null}

              {item.comment && item.canManage ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-[#edf1eb] pt-3 sm:flex-row sm:items-start sm:justify-between">
                  <details className="w-full sm:max-w-xl">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                      Edit note
                    </summary>
                    <form action={updateCommentAction.bind(null, item.comment.id, returnPath)} className="mt-2 space-y-2">
                      <textarea name="body" rows={3} defaultValue={item.comment.body} required className={textareaClasses()} />
                      <Button type="submit" data-variant="secondary" className="min-h-10 rounded-md px-3 py-2">
                        Save note
                      </Button>
                    </form>
                  </details>
                  <form action={deleteCommentAction.bind(null, item.comment.id, returnPath)}>
                    <Button type="submit" data-variant="warning" className="min-h-10 rounded-md px-3 py-2">
                      Delete
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
