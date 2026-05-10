import type { ReactNode } from "react";

import { TopNav } from "@/components/layout/top-nav";
import type { AppRole } from "@/lib/auth/rbac";

export function AppShell({ children, role }: { children: ReactNode; role: AppRole }) {
  return (
    <div className="relative min-h-screen bg-[#e9efea] text-zinc-900">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-30"
        style={{
          background:
            "radial-gradient(120% 90% at 10% 0%, rgba(106,185,103,0.56) 0%, rgba(58,146,75,0.26) 50%, rgba(233,239,234,0) 100%)",
        }}
      />
      <TopNav role={role} />
      <main className="relative mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 md:py-6 md:pb-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
