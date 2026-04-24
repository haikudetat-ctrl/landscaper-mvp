const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-lime-100 text-lime-800",
  sent: "bg-sky-100 text-sky-800",
  skipped: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  paused: "bg-emerald-50 text-emerald-800",
  inactive: "bg-zinc-200 text-zinc-700",
};

export function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700">unknown</span>;
  }

  const css = statusStyles[status] ?? "bg-emerald-50 text-zinc-800";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${css}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
