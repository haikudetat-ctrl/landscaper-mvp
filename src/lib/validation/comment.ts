import { z } from "zod";

export const commentEntityTypes = ["lead", "property", "visit", "issue"] as const;

export const commentEntityTypeSchema = z.enum(commentEntityTypes);

export const commentBodySchema = z.string().trim().min(1, "Comment is required").max(4000);

export const commentFormSchema = z.object({
  body: commentBodySchema,
});

export type CommentEntityType = (typeof commentEntityTypes)[number];
