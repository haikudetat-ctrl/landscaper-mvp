import { randomUUID } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/db/operational-events";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { requireOrgContext, throwDbError } from "@/lib/db/shared";

export async function listVisitPhotos(serviceVisitId: string) {
  const supabase = createSupabaseServerClient();
  const { orgId } = await requireOrgContext();
  const { visitPhotoBucket } = getSupabaseEnv();

  const photosResult = await supabase
    .from("media_assets")
    .select("id, service_visit_id, issue_id, storage_path, photo_type, customer_visible, captured_at, created_at")
    .eq("organization_id", orgId)
    .eq("service_visit_id", serviceVisitId)
    .order("created_at", { ascending: false });

  throwDbError(photosResult.error, "Failed to load visit photos");

  const photos = (photosResult.data ?? []) as Array<{
    id: string;
    service_visit_id: string | null;
    issue_id: string | null;
    storage_path: string;
    photo_type: string;
    customer_visible: boolean;
    captured_at: string | null;
    created_at: string;
  }>;

  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      const signedUrlResult = await supabase.storage
        .from(visitPhotoBucket)
        .createSignedUrl(photo.storage_path, 60 * 60);

      return {
        ...photo,
        signedUrl: signedUrlResult.data?.signedUrl ?? null,
      };
    }),
  );

  return photosWithUrls;
}

export async function uploadVisitPhoto(params: {
  visitId: string;
  photoType: "before" | "after" | "issue";
  caption: string | null;
  file: File;
  issueId?: string | null;
  customerVisible?: boolean;
}) {
  const supabase = createSupabaseServerClient();
  const { visitPhotoBucket } = getSupabaseEnv();
  const { orgId, userId } = await requireOrgContext();

  const visitResult = await supabase
    .from("service_visits")
    .select("id")
    .eq("id", params.visitId)
    .eq("organization_id", orgId)
    .single();
  throwDbError(visitResult.error, "Failed to verify visit before photo upload");

  const extension = params.file.name.split(".").pop() ?? "jpg";
  const filePath = `${orgId}/service_visits/${params.visitId}/${new Date().toISOString().slice(0, 10)}-${randomUUID()}.${extension}`;

  const uploadResult = await supabase.storage.from(visitPhotoBucket).upload(filePath, params.file, {
    upsert: false,
    contentType: params.file.type,
  });

  if (uploadResult.error) {
    throw new Error(`Failed photo upload: ${uploadResult.error.message}`);
  }

  const insertResult = await supabase
    .from("media_assets")
    .insert({
      organization_id: orgId,
      service_visit_id: params.visitId,
      issue_id: params.issueId ?? null,
      photo_type: params.photoType,
      storage_path: filePath,
      customer_visible: params.customerVisible ?? false,
      captured_at: new Date().toISOString(),
      uploaded_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  throwDbError(insertResult.error, "Failed to create visit photo record");

  await logEvent({
    organizationId: orgId,
    actorUserId: userId,
    entityType: "service_visit",
    entityId: params.visitId,
    eventType: "photo_uploaded",
    metadata: {
      photo_id: (insertResult.data as { id: string } | null)?.id ?? null,
      photo_type: params.photoType,
      caption: params.caption,
      issue_id: params.issueId ?? null,
      customer_visible: params.customerVisible ?? false,
      storage_path: filePath,
    },
  });

  return insertResult.data;
}
