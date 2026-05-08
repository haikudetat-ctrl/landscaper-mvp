"use client";

import { useActionState } from "react";

import {
  createCompanyProfileAction,
  type CompanyProfileSetupState,
} from "./actions";

const initialState: CompanyProfileSetupState = {
  error: null,
};

export function CompanyProfileSetup({
  defaultOwnerName,
}: {
  defaultOwnerName: string;
}) {
  const [state, formAction] = useActionState(createCompanyProfileAction, initialState);

  return (
    <main className="min-h-screen bg-[#edf5ef] px-[10px] py-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Company Profile Setup</h1>
        <p className="mt-2 text-sm text-zinc-700">
          Let&apos;s set up your company workspace first. This takes less than a minute and unlocks client onboarding.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-zinc-800">
            Company Name
            <input
              name="businessName"
              required
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="HDZ Hardscaping and Landscaping"
            />
          </label>

          <label className="block text-sm font-semibold text-zinc-800">
            Owner Display Name
            <input
              name="ownerDisplayName"
              defaultValue={defaultOwnerName}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="Owner"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Create Company Workspace
          </button>

          {state.error ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              {state.error}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
