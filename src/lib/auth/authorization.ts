import { deriveAppRole, hasPermission, type AppRole, type Permission } from "@/lib/auth/rbac";
import { getCurrentUserMembership } from "@/lib/db/auth";

type AuthorizationContext = {
  role: AppRole;
  organizationId: string;
  userId: string;
};

export async function getAuthorizationContext(): Promise<AuthorizationContext> {
  const { user, membership } = await getCurrentUserMembership();

  if (!user || !membership) {
    throw new Error("You must be signed in with an organization membership.");
  }

  return {
    role: deriveAppRole({
      email: user.email,
      membershipRole: membership.role,
    }),
    organizationId: membership.organization_id,
    userId: user.id,
  };
}

export async function requirePermission(permission: Permission): Promise<AuthorizationContext> {
  const context = await getAuthorizationContext();

  if (!hasPermission(context.role, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }

  return context;
}
