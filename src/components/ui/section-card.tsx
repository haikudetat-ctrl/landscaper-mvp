import type { ReactNode } from "react";

export function SectionCard({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-emerald-200/80 bg-[#f9fcf9] p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold uppercase tracking-wide text-emerald-700">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
