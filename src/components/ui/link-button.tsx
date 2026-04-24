import Link from "next/link";

export function LinkButton({ href, label, tone = "primary" }: { href: string; label: string; tone?: "primary" | "secondary" }) {
  const className =
    tone === "secondary"
      ? "rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
      : "rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
