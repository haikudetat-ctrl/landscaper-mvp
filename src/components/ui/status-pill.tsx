const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-blue-100 text-blue-800",
  sent: "bg-blue-100 text-blue-800",
  skipped: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  paused: "bg-zinc-200 text-zinc-800",
  inactive: "bg-zinc-200 text-zinc-800",
};

export function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">unknown</span>;
  }

  const css = statusStyles[status] ?? "bg-zinc-100 text-zinc-800";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${css}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
