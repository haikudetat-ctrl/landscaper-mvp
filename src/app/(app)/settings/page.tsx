import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { requirePagePermission } from "@/lib/auth/page-authorization";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function SettingsPage() {
  await requirePagePermission(PERMISSIONS.settingsManage);

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Organization and operator preferences." />
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        Team management, notification preferences, and billing controls are intentionally minimal in this first pass.
      </div>
      <Link href="/settings/qa" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800">
        Open QA Checklist
      </Link>
    </div>
  );
}
