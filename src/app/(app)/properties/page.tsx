import { listClientOptions, listProperties } from "@/lib/db/properties";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Views } from "@/lib/types/database";

import { PropertiesPageShell } from "./properties-page-shell";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.propertiesRead);
  await searchParams;
  const supabase = createSupabaseServerClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  const [properties, clients, todayJobsResult] = await Promise.all([
    listProperties(),
    listClientOptions(),
    supabase
      .from("v_today_jobs")
      .select("*")
      .eq("scheduled_date", today)
      .not("visit_status", "in", "(completed,canceled)")
      .order("scheduled_position", { ascending: true, nullsFirst: false }),
  ]);

  const todayOpenJobs: Views<"v_today_jobs">[] = todayJobsResult.data ?? [];

  return (
    <PropertiesPageShell
      properties={properties}
      clients={clients}
      todayOpenJobs={todayOpenJobs}
      mapProvider={process.env.NEXT_PUBLIC_MAP_PROVIDER === "mapbox" ? "mapbox" : "osm"}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      canRoute={Boolean(process.env.MAPBOX_ACCESS_TOKEN || process.env.OPENROUTESERVICE_API_KEY)}
    />
  );
}
