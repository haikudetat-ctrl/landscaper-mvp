import type { ReactNode } from "react";

export function SectionCard({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
