"use client";

import { FormEvent, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginPanel({ nextPath = "/" }: { nextPath?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isResetPending, setIsResetPending] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsPending(false);
      return;
    }

    window.location.assign(nextPath);
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError(null);
    setResetNotice(null);
    setIsResetPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("reset_email") ?? "").trim();
    if (!email) {
      setResetError("Please enter your email.");
      setIsResetPending(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (requestError) {
      setResetError(requestError.message);
      setIsResetPending(false);
      return;
    }

    setResetNotice("Password reset link sent. Check your email inbox.");
    setIsResetPending(false);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-emerald-200/80 bg-white/95 p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">L.O.A.M</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600">Use the account credentials managed in Supabase.</p>
      </div>

      <form onSubmit={signIn} className="space-y-4">
        <label className="block text-sm font-semibold text-zinc-800">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <label className="block text-sm font-semibold text-zinc-800">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="mt-6 border-t border-zinc-200 pt-4">
        <p className="text-sm font-semibold text-zinc-800">Forgot password?</p>
        <p className="mt-1 text-sm text-zinc-600">Send a reset link through Supabase Auth.</p>
        <form onSubmit={requestPasswordReset} className="mt-3 space-y-3">
          <input
            name="reset_email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@hdzlandscapingnj.com"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="submit"
            disabled={isResetPending}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResetPending ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>
        {resetNotice ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            {resetNotice}
          </p>
        ) : null}
        {resetError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {resetError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
