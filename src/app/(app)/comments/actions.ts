"use server";

import { revalidatePath } from "next/cache";

import { getAuthorizationContext } from "@/lib/auth/authorization";
import { getEntityOrganizationId } from "@/lib/db/comments";
import { maybeString, throwDbError } from "@/lib/db/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";
import { commentEntityTypeSchema, commentFormSchema, type CommentEntityType } from "@/lib/validation/comment";

function cleanReturnPath(returnPath: string) {
  return returnPath.startsWith("/") ? returnPath : "/";
}

async function touchCommentTarget(entityType: CommentEntityType, entityId: string) {
  if (entityType !== "lead" && entityType !== "issue") return;

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  if (entityType === "lead") {
    const result = await supabase
      .from("leads")
      .update({ last_activity_at: now, updated_at: now })
      .eq("id", entityId);
    throwDbError(result.error, "Failed to update lead activity");
    return;
  }

  const result = await supabase
    .from("issues")
    .update({ updated_at: now })
    .eq("id", entityId);
  throwDbError(result.error, "Failed to update issue activity");
}

async function loadCommentForOwnerAction(commentId: string, userId: string, organizationId: string) {
  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("comments")
    .select("*")
    .eq("id", commentId)
    .single();

  throwDbError(result.error, "Failed to load comment");
  const comment = result.data as Tables<"comments">;

  if (comment.organization_id !== organizationId) {
    throw new Error("Comment is outside the current organization.");
  }

  if (comment.author_user_id !== userId) {
    throw new Error("Only the author can edit or delete this comment.");
  }

  return comment;
}

export async function createCommentAction(
  entityTypeValue: string,
  entityId: string,
  returnPath: string,
  formData: FormData,
) {
  const auth = await getAuthorizationContext();
  const entityType = commentEntityTypeSchema.parse(entityTypeValue);
  const parsed = commentFormSchema.safeParse({
    body: maybeString(formData.get("body")) ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment");
  }

  const targetOrganizationId = await getEntityOrganizationId(entityType, entityId);
  if (targetOrganizationId !== auth.organizationId) {
    throw new Error("This record is outside the current organization.");
  }

  const supabase = createSupabaseServerClient();
  const result = await supabase.from("comments").insert({
    organization_id: auth.organizationId,
    author_user_id: auth.userId,
    entity_type: entityType,
    entity_id: entityId,
    body: parsed.data.body,
  });

  throwDbError(result.error, "Failed to add comment");
  await touchCommentTarget(entityType, entityId);
  revalidatePath(cleanReturnPath(returnPath));
}

export async function updateCommentAction(commentId: string, returnPath: string, formData: FormData) {
  const auth = await getAuthorizationContext();
  const parsed = commentFormSchema.safeParse({
    body: maybeString(formData.get("body")) ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment");
  }

  await loadCommentForOwnerAction(commentId, auth.userId, auth.organizationId);

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("comments")
    .update({ body: parsed.data.body })
    .eq("id", commentId);

  throwDbError(result.error, "Failed to update comment");
  revalidatePath(cleanReturnPath(returnPath));
}

export async function deleteCommentAction(commentId: string, returnPath: string) {
  const auth = await getAuthorizationContext();
  await loadCommentForOwnerAction(commentId, auth.userId, auth.organizationId);

  const supabase = createSupabaseServerClient();
  const result = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  throwDbError(result.error, "Failed to delete comment");
  revalidatePath(cleanReturnPath(returnPath));
}
