import { z } from "zod";

import { planFrequencies, planStatuses } from "@/lib/utils/constants";

export const clientImportRowSchema = z.object({
  id: z.string().min(1),
  clientName: z.string().trim().min(1, "Contact name is required").max(120),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  paymentMethod: z.enum(["venmo", "cash", "check", "other"]),
  billingNotes: z.string().trim().max(250).optional().or(z.literal("")),
  propertyName: z.string().trim().max(120).optional().or(z.literal("")),
  street1: z.string().trim().max(160).optional().or(z.literal("")),
  street2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(40).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  accessNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  serviceTypeId: z.string().uuid().optional().or(z.literal("")),
  planName: z.string().trim().max(120).optional().or(z.literal("")),
  frequency: z.enum(planFrequencies),
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  intervalDays: z.number().int().min(1).max(120).nullable(),
  startDate: z.string().date().optional().or(z.literal("")),
  quotedPrice: z.number().min(0).nullable(),
  status: z.enum(planStatuses),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const clientImportPayloadSchema = z.object({
  rows: z.array(clientImportRowSchema).min(1, "Add at least one row to import.").max(100),
});

export type ClientImportRowInput = z.infer<typeof clientImportRowSchema>;
export type ClientImportPayload = z.infer<typeof clientImportPayloadSchema>;
