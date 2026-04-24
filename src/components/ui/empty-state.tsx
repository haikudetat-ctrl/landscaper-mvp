export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-sm text-zinc-700">
      <p className="font-semibold text-zinc-800">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
    </div>
  );
}
