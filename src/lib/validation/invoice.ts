import { z } from "zod";

import { paymentMethods } from "@/lib/utils/constants";

export const createInvoiceSchema = z.object({
  visitId: z.string().uuid(),
  dueDays: z.number().int().min(0).max(180),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string().date(),
  paymentMethod: z.enum(paymentMethods),
  reference: z.string().trim().max(120).optional(),
});

export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;
