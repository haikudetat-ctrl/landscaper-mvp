import Link from "next/link";

export default function AccountPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf5ef] px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Account setup required</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950">Your account is not fully configured yet</h1>
        <p className="mt-3 text-sm text-zinc-700">
          Your login is valid, but we could not find an organization membership for this account.
          Ask your administrator to finish setup and assign your membership.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
