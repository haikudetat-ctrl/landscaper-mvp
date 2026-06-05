import { ActivityNotes } from "@/components/comments/activity-notes";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { listCommentsForEntities } from "@/lib/db/comments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/db/shared";

export default async function IssuesPage() {
  await requirePagePermission(PERMISSIONS.runView);
  const auth = await getAuthorizationContext();
  const supabase = createSupabaseServerClient();

  const result = await supabase
    .from("issues")
    .select("id, title, description, status, severity, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  throwDbError(result.error, "Failed to load issues");
  const issues = (result.data as Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    severity: string;
    created_at: string;
  }> | null) ?? [];
  const issueIds = issues.map((issue) => issue.id);
  const [comments, eventsResult] = await Promise.all([
    listCommentsForEntities("issue", issueIds),
    issueIds.length
      ? supabase
          .from("events")
          .select("id, entity_id, event_type, metadata, created_at")
          .eq("entity_type", "issue")
          .in("entity_id", issueIds)
          .order("created_at", { ascending: false })
          .limit(300)
      : { data: [], error: null },
  ]);

  throwDbError(eventsResult.error, "Failed to load issue activity");
  const events = (eventsResult.data ?? []) as Array<{
    id: string;
    entity_id: string;
    event_type: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;

  return (
    <div className="space-y-4">
      <PageHeader title="Issues" description="Track jobsite blockers, customer issues, and follow-up items." />
      <div className="space-y-2">
        {issues.map((issue) => (
          <article key={issue.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">{issue.title}</h2>
              <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs">{issue.status}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">Severity: {issue.severity}</p>
            {issue.description ? <p className="mt-2 text-sm text-zinc-700">{issue.description}</p> : null}
            <details className="group mt-4 border-t border-zinc-200 pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                Activity & Notes
                <span className="text-[11px] normal-case tracking-normal text-zinc-500 group-open:hidden">
                  {comments.filter((comment) => comment.entity_id === issue.id).length} notes
                </span>
                <span className="hidden text-[11px] normal-case tracking-normal text-zinc-500 group-open:inline">Close</span>
              </summary>
              <div className="mt-3">
                <ActivityNotes
                  entityType="issue"
                  entityId={issue.id}
                  returnPath="/issues"
                  comments={comments.filter((comment) => comment.entity_id === issue.id)}
                  events={events.filter((event) => event.entity_id === issue.id)}
                  currentUserId={auth.userId}
                  placeholder="Example: Found broken sprinkler head, customer approved repair, issue resolved"
                  emptyMessage="No issue notes yet."
                />
              </div>
            </details>
          </article>
        ))}
        {issues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
            No open issues yet. Add an issue from Today&apos;s Run when a job needs follow-up.
          </div>
        ) : null}
      </div>
    </div>
  );
}
