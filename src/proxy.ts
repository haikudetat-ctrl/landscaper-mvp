import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { deriveAppRole, hasPermission, PERMISSIONS, type Permission } from "@/lib/auth/rbac";
import type { Database } from "@/lib/types/database";

const publicRoutes = ["/login", "/account-pending", "/hdz", "/intake"];

const permissionRoutes: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/clients/import", permission: PERMISSIONS.importsRun },
  { prefix: "/communication-log", permission: PERMISSIONS.communicationRead },
  { prefix: "/service-visits", permission: PERMISSIONS.serviceVisitsRead },
  { prefix: "/service-plans", permission: PERMISSIONS.servicePlansRead },
  { prefix: "/properties", permission: PERMISSIONS.propertiesRead },
  { prefix: "/clients", permission: PERMISSIONS.clientsRead },
  { prefix: "/invoices", permission: PERMISSIONS.invoicesRead },
  { prefix: "/run", permission: PERMISSIONS.runView },
  { prefix: "/testspace", permission: PERMISSIONS.supportAdmin },
  { prefix: "/ui-kit", permission: PERMISSIONS.supportAdmin },
  { prefix: "/", permission: PERMISSIONS.dashboardView },
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function permissionForPath(pathname: string): Permission | null {
  for (const route of permissionRoutes) {
    if (route.prefix === "/" ? pathname === "/" : pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      return route.permission;
    }
  }

  return null;
}

function defaultAuthorizedPath(role: ReturnType<typeof deriveAppRole>) {
  if (hasPermission(role, PERMISSIONS.dashboardView)) return "/";
  if (hasPermission(role, PERMISSIONS.runView)) return "/run";
  if (hasPermission(role, PERMISSIONS.serviceVisitsRead)) return "/service-visits";
  if (hasPermission(role, PERMISSIONS.propertiesRead)) return "/properties";
  if (hasPermission(role, PERMISSIONS.clientsRead)) return "/clients";
  return "/account-pending";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicRoute(pathname)) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const membershipResult = await supabase
    .from("organization_members")
    .select("id, organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipResult.data;
  const hasMembership = Boolean(membership);

  if (!hasMembership && pathname !== "/onboarding") {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return NextResponse.redirect(onboardingUrl);
  }

  if (hasMembership && pathname === "/account-pending") {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/onboarding";
    appUrl.search = "";
    return NextResponse.redirect(appUrl);
  }

  if (membership) {
    const onboardingResult = await supabase
      .from("organization_onboarding")
      .select("status")
      .eq("organization_id", membership.organization_id)
      .limit(1)
      .maybeSingle();

    const onboardingStatus = onboardingResult.data?.status ?? "not_started";
    const isComplete = onboardingStatus === "completed";

    if (!isComplete && pathname !== "/onboarding") {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      onboardingUrl.search = "";
      return NextResponse.redirect(onboardingUrl);
    }

    if (isComplete && (pathname === "/login" || pathname === "/onboarding")) {
      const appUrl = request.nextUrl.clone();
      appUrl.pathname = "/";
      appUrl.search = "";
      return NextResponse.redirect(appUrl);
    }

    const appRole = deriveAppRole({
      email: user.email,
      membershipRole: membership.role,
    });
    const neededPermission = permissionForPath(pathname);

    if (neededPermission && !hasPermission(appRole, neededPermission)) {
      const fallbackPath = defaultAuthorizedPath(appRole);
      if (pathname !== fallbackPath) {
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = fallbackPath;
        deniedUrl.searchParams.set("denied", pathname);
        return NextResponse.redirect(deniedUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
