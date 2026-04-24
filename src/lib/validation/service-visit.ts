import { z } from "zod";

import { visitStatuses } from "@/lib/utils/constants";

export const serviceVisitUpdateSchema = z.object({
  scheduledDate: z.string().date(),
  status: z.enum(visitStatuses),
  notes: z.string().trim().max(2000).optional(),
});

export const serviceVisitSkipSchema = z.object({
  skippedReason: z.string().trim().min(1, "Reason is required").max(120),
  skipNote: z.string().trim().max(2000).optional(),
});

export const serviceVisitRescheduleSchema = z.object({
  scheduledDate: z.string().date(),
  notes: z.string().trim().max(2000).optional(),
});

export type ServiceVisitUpdateValues = z.infer<typeof serviceVisitUpdateSchema>;
