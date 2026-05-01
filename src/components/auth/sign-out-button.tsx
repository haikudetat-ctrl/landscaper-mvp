"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ className = "" }: { className?: string }) {
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isPending}
      className={className || "rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-sm text-zinc-700 hover:bg-emerald-50 disabled:opacity-60"}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
