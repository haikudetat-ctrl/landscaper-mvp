import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "warning";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "data-variant"?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[#287b40] text-white hover:bg-[#236d38]",
  secondary: "border border-emerald-300 bg-white text-zinc-900 hover:bg-emerald-50",
  warning: "bg-amber-300 text-zinc-950 hover:bg-amber-200",
};

export function Button({ className, type = "button", "data-variant": variant = "primary", ...props }: ButtonProps) {

  return (
    <button
      type={type}
      data-variant={variant}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
