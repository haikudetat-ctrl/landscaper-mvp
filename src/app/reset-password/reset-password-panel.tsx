"use client";

import { FormEvent, useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordPanel() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        setError("Reset link is invalid or expired. Request a new password reset link.");
        setIsReady(false);
        return;
      }

      setIsReady(true);
    }

    checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsPending(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsPending(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsPending(false);
      return;
    }

    setNotice("Password updated. Redirecting to login...");
    setIsPending(false);

    window.setTimeout(() => {
      window.location.assign("/login");
    }, 900);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-emerald-200/80 bg-white/95 p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">L.O.A.M</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Reset password</h1>
        <p className="mt-2 text-sm text-zinc-600">Set a new password for your account.</p>
      </div>

      <form onSubmit={updatePassword} className="space-y-4">
        <label className="block text-sm font-semibold text-zinc-800">
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!isReady || isPending}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-zinc-100"
          />
        </label>

        <label className="block text-sm font-semibold text-zinc-800">
          Confirm new password
          <input
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!isReady || isPending}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-zinc-100"
          />
        </label>

        <button
          type="submit"
          disabled={!isReady || isPending}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Updating password..." : "Update password"}
        </button>
      </form>

      {notice ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
