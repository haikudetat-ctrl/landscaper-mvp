import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "warning";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "data-variant"?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[#2b6840] text-white hover:bg-[#235537]",
  secondary: "border border-[#92a891] bg-[#f8faf6] text-zinc-900 hover:bg-[#e1e8df]",
  warning: "bg-[#d6bf7a] text-zinc-950 hover:bg-[#c8b06b]",
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
