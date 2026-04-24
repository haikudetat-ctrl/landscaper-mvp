"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createServicePlan,
  generateVisitsForActivePlans,
  generateVisitsForPlan,
  updateServicePlan,
} from "@/lib/db/service-plans";
import { maybeString, parseInteger } from "@/lib/db/shared";
import { servicePlanFormSchema } from "@/lib/validation/service-plan";

function mapFrequency(value: string): string {
  if (value === "custom-interval") return "custom_interval";
  return value;
}

function normalizePlanForm(formData: FormData) {
  return {
    propertyId: (formData.get("propertyId") as string) ?? "",
    serviceTypeId: (formData.get("serviceTypeId") as string) ?? "",
    name: maybeString(formData.get("name")) ?? "",
    frequency: (formData.get("frequency") as string) ?? "weekly",
    dayOfWeek: parseInteger(formData.get("dayOfWeek")),
    intervalDays: parseInteger(formData.get("intervalDays")),
    startDate: (formData.get("startDate") as string) ?? "",
    endDate: (formData.get("endDate") as string) ?? "",
    quotedPrice: Number(formData.get("quotedPrice") ?? 0),
    status: (formData.get("status") as string) ?? "active",
    notes: maybeString(formData.get("notes")) ?? "",
  };
}

export async function createServicePlanAction(formData: FormData) {
  const parsed = servicePlanFormSchema.safeParse(normalizePlanForm(formData));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid service plan form");
  }

  const values = parsed.data;

  const created = await createServicePlan({
    property_id: values.propertyId,
    service_type_id: values.serviceTypeId,
    plan_name: values.name,
    frequency_type: mapFrequency(values.frequency),
    day_of_week: values.dayOfWeek ?? null,
    interval_count: values.intervalDays ?? null,
    start_date: values.startDate,
    end_date: values.endDate || null,
    quoted_price: values.quotedPrice,
    status: values.status,
    notes: values.notes || null,
    auto_generate_visits: true,
    billing_mode: "per_visit",
  });

  revalidatePath("/service-plans");
  revalidatePath("/properties");
  redirect(`/service-plans/${created.id}`);
}

export async function updateServicePlanAction(planId: string, formData: FormData) {
  const parsed = servicePlanFormSchema.safeParse(normalizePlanForm(formData));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid service plan form");
  }

  const values = parsed.data;

  await updateServicePlan(planId, {
    property_id: values.propertyId,
    service_type_id: values.serviceTypeId,
    plan_name: values.name,
    frequency_type: mapFrequency(values.frequency),
    day_of_week: values.dayOfWeek ?? null,
    interval_count: values.intervalDays ?? null,
    start_date: values.startDate,
    end_date: values.endDate || null,
    quoted_price: values.quotedPrice,
    status: values.status,
    notes: values.notes || null,
    billing_mode: "per_visit",
  });

  revalidatePath("/service-plans");
  revalidatePath(`/service-plans/${planId}`);
  redirect(`/service-plans/${planId}`);
}

export async function generateVisitsForPlanAction(planId: string, formData: FormData) {
  const startDate = (formData.get("startDate") as string) ?? "";
  const endDate = (formData.get("endDate") as string) ?? "";

  if (!startDate || !endDate) {
    throw new Error("Start and end dates are required for visit generation.");
  }

  await generateVisitsForPlan(planId, startDate, endDate);

  revalidatePath(`/service-plans/${planId}`);
  revalidatePath("/service-visits");
  revalidatePath("/");
  redirect(`/service-plans/${planId}`);
}

export async function generateVisitsForActivePlansAction(formData: FormData) {
  const startDate = (formData.get("startDate") as string) ?? "";
  const endDate = (formData.get("endDate") as string) ?? "";

  if (!startDate || !endDate) {
    throw new Error("Start and end dates are required for visit generation.");
  }

  await generateVisitsForActivePlans(startDate, endDate);

  revalidatePath("/service-visits");
  revalidatePath("/");
  redirect("/service-plans");
}
