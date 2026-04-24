import { z } from "zod";

export const clientFormSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  businessName: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  billingAddress: z.string().trim().max(250).optional(),
  notes: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
