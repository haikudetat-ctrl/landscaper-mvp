import { redirect } from "next/navigation";

import { getCurrentUserMembership } from "@/lib/db/auth";

import { LoginPanel } from "./login-panel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const { user, membership } = await getCurrentUserMembership();

  if (user && membership) {
    redirect("/");
  }

  if (user && !membership) {
    redirect("/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9efea] px-4 py-10">
      <LoginPanel nextPath={params.next?.startsWith("/") ? params.next : "/"} />
    </main>
  );
}
