import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";
import type { CommentEntityType } from "@/lib/validation/comment";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export type OperationalComment = Tables<"comments"> & {
  author_name: string;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function authorName(profile: ProfileRecord | undefined) {
  return profile?.display_name || profile?.email || "Team member";
}

async function hydrateAuthors(comments: Tables<"comments">[]): Promise<OperationalComment[]> {
  if (comments.length === 0) return [];

  const supabase = createSupabaseServerClient();
  const authorIds = Array.from(new Set(comments.map((comment) => comment.author_user_id)));
  const profilesResult = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", authorIds);

  throwDbError(profilesResult.error, "Failed to load comment authors");

  const profilesById = new Map(
    ((profilesResult.data ?? []) as ProfileRecord[]).map((profile) => [profile.id, profile]),
  );

  return comments.map((comment) => ({
    ...comment,
    author_name: authorName(profilesById.get(comment.author_user_id)),
  }));
}

export async function listCommentsForEntity(entityType: CommentEntityType, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase
    .from("comments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(100);

  throwDbError(result.error, "Failed to load comments");
  return hydrateAuthors((result.data ?? []) as Tables<"comments">[]);
}

export async function listCommentsForEntities(entityType: CommentEntityType, entityIds: string[]) {
  if (entityIds.length === 0) return [];

  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const result = await supabase
    .from("comments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("entity_type", entityType)
    .in("entity_id", entityIds)
    .order("created_at", { ascending: false })
    .limit(500);

  throwDbError(result.error, "Failed to load comments");
  return hydrateAuthors((result.data ?? []) as Tables<"comments">[]);
}

export async function getEntityOrganizationId(entityType: CommentEntityType, entityId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const table =
    entityType === "lead"
      ? "leads"
      : entityType === "property"
        ? "properties"
        : entityType === "visit"
          ? "service_visits"
          : "issues";

  const result = await supabase
    .from(table)
    .select("organization_id")
    .eq("id", entityId)
    .eq("organization_id", orgId)
    .maybeSingle();

  throwDbError(result.error, "Failed to load comment target");
  const organizationId = (result.data as { organization_id?: string | null } | null)?.organization_id;

  if (!organizationId) {
    throw new Error("This record is missing organization ownership and cannot receive comments yet.");
  }

  return organizationId;
}
