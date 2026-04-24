import type { ReactNode } from "react";

import { TopNav } from "@/components/layout/top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 md:py-6 md:pb-6 lg:px-8">{children}</main>
    </div>
  );
}
