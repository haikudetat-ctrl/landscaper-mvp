"use client";

import { useActionState } from "react";

import { createOrganizationAction, type OnboardingFormState } from "./actions";

const initialState: OnboardingFormState = {
  error: null,
};

export function OnboardingForm({ defaultOwnerName }: { defaultOwnerName: string }) {
  const [state, formAction] = useActionState(createOrganizationAction, initialState);

  return (
    <form action={formAction} className="w-full max-w-xl space-y-4 rounded-2xl border border-emerald-200/80 bg-white/95 p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Workspace setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Create your business workspace</h1>
        <p className="mt-2 text-sm text-zinc-600">This creates your initial organization and owner membership.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-zinc-800">Business name</span>
        <input
          name="businessName"
          required
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
          placeholder="Green Acres Landscaping"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-zinc-800">Owner display name</span>
        <input
          name="ownerDisplayName"
          defaultValue={defaultOwnerName}
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 md:text-sm"
        />
      </label>

      <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
        Create workspace
      </button>

      {state.error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
