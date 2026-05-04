import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

export interface AlertCardProps {
  variant: "warning" | "danger" | "info";
  title: string;
  description: string;
  ctaLabel?: string;
  onClick?: () => void;
}

const variantClassMap: Record<AlertCardProps["variant"], string> = {
  warning: "border-yellow-400 bg-yellow-50",
  danger: "border-red-400 bg-red-50",
  info: "border-blue-400 bg-blue-50",
};

export function AlertCard({ variant, title, description, ctaLabel, onClick }: AlertCardProps) {
  return (
    <Card className={cn("rounded-2xl p-4", variantClassMap[variant])}>
      <p className="text-base font-bold text-zinc-950">{title}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-800">{description}</p>
      {ctaLabel ? (
        <Button className="mt-3" data-variant={variant === "warning" ? "warning" : "secondary"} onClick={onClick}>
          {ctaLabel}
        </Button>
      ) : null}
    </Card>
  );
}
