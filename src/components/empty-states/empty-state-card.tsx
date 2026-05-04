import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface EmptyStateCardProps {
  icon: ReactNode;
  headline: string;
  helperText: string;
  ctaLabel?: string;
  onClick?: () => void;
}

export function EmptyStateCard({ icon, headline, helperText, ctaLabel, onClick }: EmptyStateCardProps) {
  return (
    <Card className="rounded-2xl border border-emerald-200 bg-white p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-lg font-bold text-[#287b40]">{icon}</div>
      <p className="text-lg font-bold text-zinc-950">{headline}</p>
      <p className="mt-2 text-sm font-medium text-zinc-800">{helperText}</p>
      {ctaLabel ? (
        <Button className="mt-5 w-full sm:w-auto" onClick={onClick}>
          {ctaLabel}
        </Button>
      ) : null}
    </Card>
  );
}
