import { z } from "zod";

import { planFrequencies, planStatuses } from "@/lib/utils/constants";

export const servicePlanFormSchema = z.object({
  propertyId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  name: z.string().trim().min(1, "Plan name is required").max(120),
  frequency: z.enum(planFrequencies),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  intervalDays: z.number().int().min(1).max(120).optional().nullable(),
  startDate: z.string().date(),
  endDate: z.string().date().optional().or(z.literal("")),
  quotedPrice: z.number().min(0),
  status: z.enum(planStatuses),
  notes: z.string().trim().max(2000).optional(),
});

export type ServicePlanFormValues = z.infer<typeof servicePlanFormSchema>;
