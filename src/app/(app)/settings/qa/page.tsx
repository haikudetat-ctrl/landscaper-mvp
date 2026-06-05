import { PageHeader } from "@/components/ui/page-header";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { getCurrentUserMembership } from "@/lib/db/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2 text-sm">
      <span className="text-zinc-600">{label}</span>
      <span className="font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

export default async function SettingsQaPage() {
  await requirePagePermission(PERMISSIONS.settingsManage);
  const supabase = createSupabaseServerClient();
  const { user, membership } = await getCurrentUserMembership();

  const [bucketResult, eventResult] = await Promise.all([
    supabase.storage.getBucket(process.env.SUPABASE_VISIT_PHOTO_BUCKET ?? "visit-photos"),
    membership
      ? supabase
          .from("events")
          .select("created_at")
          .eq("organization_id", membership.organization_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="QA Checklist" description="Internal production-readiness preflight for owner operations." />
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <Row label="Env (Supabase URL + anon key)" value={process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing"} />
        <Row label="Auth status" value={user ? "authenticated" : "not signed in"} />
        <Row label="Email provider mode" value={process.env.LOAM_EMAIL_PROVIDER === "enabled" ? "enabled" : "preview"} />
        <Row label="Storage bucket" value={bucketResult.data ? "available" : "missing"} />
        <Row label="Current org" value={membership?.organizations?.name ?? "none"} />
        <Row label="Current user role" value={membership?.role ?? "none"} />
        <Row label="Last event timestamp" value={(eventResult.data as { created_at?: string } | null)?.created_at ?? "none"} />
        <Row label="App version" value={process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev"} />
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600">
        Storage note: policy is now org-path scoped (`organization_id/service_visits/...`). Object-level RLS is improved but still depends on correct path writes.
      </div>
    </div>
  );
}
