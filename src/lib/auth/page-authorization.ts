import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/authorization";
import type { Permission } from "@/lib/auth/rbac";

export async function requirePagePermission(permission: Permission, fallbackPath = "/account-pending") {
  try {
    await requirePermission(permission);
  } catch {
    redirect(fallbackPath);
  }
}
