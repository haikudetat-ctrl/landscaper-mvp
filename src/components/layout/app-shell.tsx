import type { ReactNode } from "react";

import { TopNav } from "@/components/layout/top-nav";
import type { AppRole } from "@/lib/auth/rbac";

export function AppShell({
  children,
  role,
  userEmail,
  organizationName,
}: {
  children: ReactNode;
  role: AppRole;
  userEmail: string | null;
  organizationName: string | null;
}) {
  return (
    <div className="relative min-h-screen bg-[#dde3db] text-zinc-900">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-30"
        style={{
          background:
            "radial-gradient(120% 90% at 8% 0%, rgba(56,108,66,0.48) 0%, rgba(85,128,72,0.2) 48%, rgba(221,227,219,0) 100%)",
        }}
      />
      <TopNav role={role} userEmail={userEmail} organizationName={organizationName} />
      <main className="relative mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 md:py-6 md:pb-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
