import type { ReactNode } from "react";

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function FormField({
  label,
  name,
  children,
  hint,
  required,
}: {
  label: string;
  name?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={name} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-800">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function inputClasses() {
  return "w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-zinc-400 md:py-2 md:text-sm";
}

export function textareaClasses() {
  return "w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-zinc-400 md:py-2 md:text-sm";
}

export function selectClasses() {
  return "w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none focus:border-zinc-400 md:py-2 md:text-sm";
}

export function checkboxClasses() {
  return "h-5 w-5 rounded border-zinc-300 md:h-4 md:w-4";
}
