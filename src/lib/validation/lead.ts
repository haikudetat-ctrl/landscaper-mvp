import { z } from "zod";

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
