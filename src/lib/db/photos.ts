import { randomUUID } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { throwDbError } from "@/lib/db/shared";

export async function listVisitPhotos(serviceVisitId: string) {
  const supabase = createSupabaseServerClient();
  const { visitPhotoBucket } = getSupabaseEnv();

  const photosResult = await supabase
    .from("visit_photos")
    .select("*")
    .eq("service_visit_id", serviceVisitId)
    .order("uploaded_at", { ascending: false });

  throwDbError(photosResult.error, "Failed to load visit photos");

  const photos = photosResult.data ?? [];

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
}) {
  const supabase = createSupabaseServerClient();
  const { visitPhotoBucket } = getSupabaseEnv();

  const extension = params.file.name.split(".").pop() ?? "jpg";
  const filePath = `${params.visitId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

  const uploadResult = await supabase.storage.from(visitPhotoBucket).upload(filePath, params.file, {
    upsert: false,
    contentType: params.file.type,
  });

  if (uploadResult.error) {
    throw new Error(`Failed photo upload: ${uploadResult.error.message}`);
  }

  const insertResult = await supabase
    .from("visit_photos")
    .insert({
      service_visit_id: params.visitId,
      photo_type: params.photoType,
      caption: params.caption,
      storage_path: filePath,
      uploaded_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  throwDbError(insertResult.error, "Failed to create visit photo record");
  return insertResult.data;
}
