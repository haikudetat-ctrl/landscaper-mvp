import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/types/database";

const publicRoutes = ["/login", "/account-pending", "/hdz", "/intake"];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
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
    .select("id, organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipResult.data;
  const hasMembership = Boolean(membership);

  if (!hasMembership && pathname !== "/account-pending") {
    const pendingUrl = request.nextUrl.clone();
    pendingUrl.pathname = "/account-pending";
    pendingUrl.search = "";
    return NextResponse.redirect(pendingUrl);
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
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
