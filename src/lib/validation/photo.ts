import { z } from "zod";

export const uploadVisitPhotoSchema = z.object({
  visitId: z.string().uuid(),
  photoType: z.enum(["before", "after", "issue"]),
  caption: z.string().trim().max(240).optional(),
});
