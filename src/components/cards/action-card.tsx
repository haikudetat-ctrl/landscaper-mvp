import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

export interface ActionCardProps {
  title: string;
  description?: string;
  ctaLabel: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "warning";
  disabled?: boolean;
  onClick?: () => void;
}

const toneMap: Record<NonNullable<ActionCardProps["variant"]>, string> = {
  primary: "border-emerald-300 bg-emerald-50",
  secondary: "border-zinc-300 bg-white",
  warning: "border-amber-300 bg-amber-50",
};

export function ActionCard({ title, description, ctaLabel, icon, variant = "primary", disabled, onClick }: ActionCardProps) {
  return (
    <Card className={cn("rounded-2xl p-5 shadow-[0_16px_30px_-24px_rgba(24,108,49,0.5)]", toneMap[variant])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
          {description ? <p className="mt-1 text-sm font-medium text-zinc-700">{description}</p> : null}
        </div>
        {icon ? <div className="text-[#287b40]">{icon}</div> : null}
      </div>
      <Button className="mt-4 w-full" data-variant={variant} disabled={disabled} onClick={onClick}>
        {ctaLabel}
      </Button>
    </Card>
  );
}
