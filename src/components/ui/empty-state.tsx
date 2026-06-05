import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EmptyStateInlineProps = {
  variant?: "inline";
  title: string;
  description?: string;
};

type EmptyStateCardProps = {
  variant: "card";
  icon: ReactNode;
  headline: string;
  helperText: string;
  ctaLabel?: string;
  onClick?: () => void;
};

type EmptyStateProps = EmptyStateInlineProps | EmptyStateCardProps;

export function EmptyState({
  ...props
}: EmptyStateProps) {
  if (props.variant === "card") {
    return (
      <Card className="rounded-2xl border border-emerald-200 bg-white p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-lg font-bold text-[#287b40]">
          {props.icon}
        </div>
        <p className="text-lg font-bold text-zinc-950">{props.headline}</p>
        <p className="mt-2 text-sm font-medium text-zinc-800">{props.helperText}</p>
        {props.ctaLabel ? (
          <Button className="mt-5 w-full sm:w-auto" onClick={props.onClick}>
            {props.ctaLabel}
          </Button>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-sm text-zinc-700">
      <p className="font-semibold text-zinc-800">{props.title}</p>
      {props.description ? <p className="mt-1">{props.description}</p> : null}
    </div>
  );
}
