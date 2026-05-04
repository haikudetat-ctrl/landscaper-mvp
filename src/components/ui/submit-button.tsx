"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  name,
  value,
  className,
}: {
  label: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`min-h-11 rounded-full bg-[#287b40] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      {pending ? pendingLabel ?? "Saving..." : label}
    </button>
  );
}
