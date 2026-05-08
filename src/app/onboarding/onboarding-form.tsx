"use client";

import type { Tables } from "@/lib/types/database";
import { ClientImportWizard } from "@/app/(app)/clients/import/client-import-wizard";

import {
  completeOnboardingAction,
  importOnboardingClientsAction,
  startOnboardingAction,
} from "./actions";

type ServiceTypeOption = Pick<Tables<"service_types">, "id" | "label">;

type OnboardingProps = {
  organizationName: string;
  status: "not_started" | "in_progress" | "import_uploaded" | "import_validated" | "completed";
  currentStep: string;
  serviceTypes: ServiceTypeOption[];
  counts: {
    clients: number;
    properties: number;
    services: number;
    visits: number;
  };
};

function statusIndex(step: string) {
  if (step === "welcome") return 0;
  if (step === "import") return 1;
  if (step === "review") return 2;
  return 3;
}

export function OnboardingForm({ organizationName, status, currentStep, serviceTypes, counts }: OnboardingProps) {
  const active = statusIndex(currentStep);

  return (
    <main className="min-h-screen bg-[#edf5ef] px-[10px] py-6">
      <div className="mx-auto flex w-full max-w-none flex-col gap-4">
        <section className="mx-auto w-full max-w-5xl rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Client setup</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950">Welcome to {organizationName}</h1>
          <p className="mt-2 text-sm text-zinc-700">Complete setup in a few steps. You can stop and resume anytime.</p>

          <div className="mt-4 grid grid-cols-4 gap-2 text-xs md:text-sm">
            {[
              "Welcome",
              "Bulk import",
              "Review",
              "Complete",
            ].map((label, index) => (
              <div
                key={label}
                className={`rounded-xl border px-3 py-2 text-center font-semibold ${
                  index <= active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-zinc-50 text-zinc-500"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </section>

        {(status === "not_started" || currentStep === "welcome") && (
          <section className="mx-auto w-full max-w-5xl rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Step 1: Confirm company</h2>
            <p className="mt-2 text-sm text-zinc-700">
              You are setting up <span className="font-semibold">{organizationName}</span>. Next, import your clients, properties, and service plans.
            </p>
            <form action={startOnboardingAction} className="mt-4">
              <button className="w-full rounded-full bg-emerald-700 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-800 md:w-auto">
                Start setup
              </button>
            </form>
          </section>
        )}

        {(status === "in_progress" || status === "import_uploaded" || currentStep === "import") && (
          <section className="w-full rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-zinc-950">Step 2: Bulk import</h2>
            <ClientImportWizard action={importOnboardingClientsAction} serviceTypes={serviceTypes} />
          </section>
        )}

        {(status === "import_validated" || currentStep === "review") && (
          <section className="mx-auto w-full max-w-5xl rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Step 3: Review import</h2>
            <p className="mt-2 text-sm text-zinc-700">Review your imported totals before finishing onboarding.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-900">Clients: {counts.clients}</div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-900">Properties: {counts.properties}</div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-900">Services: {counts.services}</div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-900">Scheduled visits: {counts.visits}</div>
            </div>

            <form action={completeOnboardingAction} className="mt-5">
              <button className="w-full rounded-full bg-emerald-700 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-800 md:w-auto">
                Complete onboarding
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
