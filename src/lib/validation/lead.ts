import { z } from "zod";

export const leadStages = [
  "new",
  "contacted",
  "qualified",
  "site_visit_scheduled",
  "estimate_sent",
  "follow_up",
  "won",
  "lost",
] as const;

export const leadStageSchema = z.enum(leadStages);

export const leadStageUpdateSchema = z.object({
  stage: leadStageSchema,
});

export const leadInternalNoteSchema = z.object({
  note: z.string().trim().min(1, "Internal note is required").max(2000),
});

export const leadCommunicationSchema = z.object({
  channel: z.enum(["call", "text", "email", "in_person", "other"]),
  recipient: z.string().trim().min(1, "Recipient is required").max(160),
  subject: z.string().trim().max(250).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const leadLostSchema = z.object({
  reason: z.string().trim().min(1, "Lost reason is required").max(1000),
});

export const leadClientLinkSchema = z.object({
  clientId: z.string().uuid("Select a valid client."),
});

export const leadPropertyLinkSchema = z.object({
  propertyId: z.string().uuid("Select a valid property."),
});

export const leadConversionSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  propertyId: z.string().uuid().optional().or(z.literal("")),
  fullName: z.string().trim().min(1, "Client name is required").max(160),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Phone is required").max(50),
  propertyName: z.string().trim().max(120).optional(),
  street1: z.string().trim().min(1, "Street address is required").max(160),
  street2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().min(1, "State is required").max(40),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  serviceNotes: z.string().trim().max(2000).optional(),
  accessNotes: z.string().trim().max(2000).optional(),
});

export const leadSiteVisitSchema = z.object({
  scheduledDate: z.string().date(),
  serviceTypeId: z.string().uuid().optional().or(z.literal("")),
  quotedPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const leadServiceOptions = [
  "Lawn Maintenance",
  "Hardscaping",
  "Outdoor Lighting",
  "Top Soil",
  "Sod",
  "Tree Service",
  "Pavers",
  "Retaining Walls",
  "Sidewalks",
  "Driveways / Concrete",
] as const;

export const leadIntakeSchema = z.object({
  tenantSlug: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2, "Name is required").max(120),
  phone: z.string().trim().min(7, "Phone is required").max(50),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  propertyAddress: z.string().trim().min(5, "Property address is required").max(250),
  servicesRequested: z.array(z.string().trim()).min(1, "Select at least one service"),
  projectDescription: z.string().trim().min(10, "Please add a short project description").max(2000),
  timeline: z.string().trim().min(1, "Select a timeline").max(100),
  budgetRange: z.string().trim().min(1, "Select a budget range").max(100),
  preferredContactMethod: z.string().trim().min(1, "Select a contact method").max(50),
});

export type LeadIntakeInput = z.infer<typeof leadIntakeSchema>;
