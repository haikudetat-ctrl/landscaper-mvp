export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
      <p className="font-medium text-zinc-800">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
    </div>
  );
}
