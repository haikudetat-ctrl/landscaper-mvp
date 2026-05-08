"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { leadIntakeSchema } from "@/lib/validation/lead";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitHdzIntakeAction(formData: FormData) {
  const payload = {
    tenantSlug: "hdz",
    name: readText(formData, "name"),
    phone: readText(formData, "phone"),
    email: readText(formData, "email"),
    propertyAddress: readText(formData, "propertyAddress"),
    servicesRequested: formData.getAll("servicesRequested").map((v) => String(v).trim()).filter(Boolean),
    projectDescription: readText(formData, "projectDescription"),
    timeline: readText(formData, "timeline"),
    budgetRange: readText(formData, "budgetRange"),
    preferredContactMethod: readText(formData, "preferredContactMethod"),
  };

  const parsed = leadIntakeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid intake form input.");
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const leadResult = await supabase
    .from("leads" as never)
    .insert({
      tenant_slug: parsed.data.tenantSlug,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      property_address: parsed.data.propertyAddress,
      services_requested: parsed.data.servicesRequested,
      project_description: parsed.data.projectDescription,
      timeline: parsed.data.timeline,
      budget_range: parsed.data.budgetRange,
      preferred_contact_method: parsed.data.preferredContactMethod,
      status: "new",
      source: "landing_page",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (leadResult.error || !leadResult.data?.id) {
    throw new Error(`Failed to submit lead: ${leadResult.error?.message ?? "Unknown insert error"}`);
  }

  const files = formData.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > 0) {
    const { leadPhotoBucket } = getSupabaseEnv();

    for (const file of files.slice(0, 8)) {
      const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filePath = `${leadResult.data.id}/${randomUUID()}.${extension}`;

      const uploadResult = await supabase.storage.from(leadPhotoBucket).upload(filePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

      if (uploadResult.error) {
        throw new Error(`Photo upload failed: ${uploadResult.error.message}`);
      }

      const photoInsert = await supabase.from("lead_photos" as never).insert({
        lead_id: leadResult.data.id,
        storage_path: filePath,
        caption: null,
        created_at: now,
      });

      if (photoInsert.error) {
        throw new Error(`Failed to save lead photo: ${photoInsert.error.message}`);
      }
    }
  }

  revalidatePath("/hdz");
  revalidatePath("/intake/hdz");
  redirect("/intake/hdz?submitted=1");
}
