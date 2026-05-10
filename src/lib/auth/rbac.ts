export const SUPER_ADMIN_EMAILS = ["joe@2-stack.com", "chris@2-stack.com"] as const;

export const APP_ROLES = [
  "super_admin",
  "platform_owner",
  "business_owner",
  "office_manager",
  "crew_lead",
  "crew_member",
  "client_portal_user",
  "public_lead",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const PERMISSIONS = {
  dashboardView: "dashboard.view",
  runView: "run.view",
  runExecute: "run.execute",
  scheduleView: "schedule.view",
  scheduleShift: "schedule.shift",
  clientsRead: "clients.read",
  clientsWrite: "clients.write",
  propertiesRead: "properties.read",
  propertiesWrite: "properties.write",
  servicePlansRead: "service_plans.read",
  servicePlansWrite: "service_plans.write",
  serviceVisitsRead: "service_visits.read",
  serviceVisitsWrite: "service_visits.write",
  invoicesRead: "invoices.read",
  invoicesWrite: "invoices.write",
  paymentsRecord: "payments.record",
  communicationRead: "communication.read",
  importsRun: "imports.run",
  teamManage: "team.manage",
  settingsManage: "settings.manage",
  reportsView: "reports.view",
  automationsManage: "automations.manage",
  supportAdmin: "support.admin",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const rolePermissions: Record<AppRole, Set<Permission>> = {
  super_admin: new Set(Object.values(PERMISSIONS)),
  platform_owner: new Set([
    PERMISSIONS.dashboardView,
    PERMISSIONS.reportsView,
    PERMISSIONS.supportAdmin,
    PERMISSIONS.settingsManage,
    PERMISSIONS.teamManage,
  ]),
  business_owner: new Set([
    PERMISSIONS.dashboardView,
    PERMISSIONS.runView,
    PERMISSIONS.runExecute,
    PERMISSIONS.scheduleView,
    PERMISSIONS.clientsRead,
    PERMISSIONS.clientsWrite,
    PERMISSIONS.propertiesRead,
    PERMISSIONS.propertiesWrite,
    PERMISSIONS.servicePlansRead,
    PERMISSIONS.servicePlansWrite,
    PERMISSIONS.serviceVisitsRead,
    PERMISSIONS.serviceVisitsWrite,
    PERMISSIONS.invoicesRead,
    PERMISSIONS.invoicesWrite,
    PERMISSIONS.paymentsRecord,
    PERMISSIONS.communicationRead,
    PERMISSIONS.importsRun,
    PERMISSIONS.teamManage,
    PERMISSIONS.settingsManage,
    PERMISSIONS.reportsView,
    PERMISSIONS.automationsManage,
  ]),
  office_manager: new Set([
    PERMISSIONS.dashboardView,
    PERMISSIONS.runView,
    PERMISSIONS.runExecute,
    PERMISSIONS.scheduleView,
    PERMISSIONS.scheduleShift,
    PERMISSIONS.clientsRead,
    PERMISSIONS.clientsWrite,
    PERMISSIONS.propertiesRead,
    PERMISSIONS.propertiesWrite,
    PERMISSIONS.servicePlansRead,
    PERMISSIONS.servicePlansWrite,
    PERMISSIONS.serviceVisitsRead,
    PERMISSIONS.serviceVisitsWrite,
    PERMISSIONS.invoicesRead,
    PERMISSIONS.invoicesWrite,
    PERMISSIONS.paymentsRecord,
    PERMISSIONS.communicationRead,
    PERMISSIONS.reportsView,
  ]),
  crew_lead: new Set([
    PERMISSIONS.runView,
    PERMISSIONS.runExecute,
    PERMISSIONS.scheduleView,
    PERMISSIONS.propertiesRead,
    PERMISSIONS.serviceVisitsRead,
    PERMISSIONS.serviceVisitsWrite,
  ]),
  crew_member: new Set([
    PERMISSIONS.runView,
    PERMISSIONS.runExecute,
    PERMISSIONS.scheduleView,
    PERMISSIONS.propertiesRead,
    PERMISSIONS.serviceVisitsRead,
  ]),
  client_portal_user: new Set([
    PERMISSIONS.dashboardView,
    PERMISSIONS.propertiesRead,
    PERMISSIONS.servicePlansRead,
    PERMISSIONS.serviceVisitsRead,
    PERMISSIONS.invoicesRead,
  ]),
  public_lead: new Set([]),
};

export function deriveAppRole(input: {
  email?: string | null;
  membershipRole?: string | null;
}): AppRole {
  const email = input.email?.toLowerCase() ?? null;
  if (email && SUPER_ADMIN_EMAILS.includes(email as (typeof SUPER_ADMIN_EMAILS)[number])) {
    return "super_admin";
  }

  switch (input.membershipRole) {
    case "owner":
      return "business_owner";
    case "admin":
      return "office_manager";
    case "crew_lead":
      return "crew_lead";
    case "crew_member":
      return "crew_member";
    default:
      return "crew_member";
  }
}

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}
