import { z } from "zod";

export const propertyFormSchema = z.object({
  clientId: z.string().uuid(),
  propertyName: z.string().trim().max(120).optional(),
  addressLine1: z.string().trim().min(1, "Street address is required").max(160),
  addressLine2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().min(1, "State is required").max(40),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  gateNotes: z.string().trim().max(2000).optional(),
  accessNotes: z.string().trim().max(2000).optional(),
  serviceNotes: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
