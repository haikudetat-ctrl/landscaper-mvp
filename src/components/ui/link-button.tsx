import Link from "next/link";

export function LinkButton({ href, label, tone = "primary" }: { href: string; label: string; tone?: "primary" | "secondary" }) {
  const className =
    tone === "secondary"
      ? "rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-emerald-50"
      : "rounded-full bg-[#287b40] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#236d38]";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
