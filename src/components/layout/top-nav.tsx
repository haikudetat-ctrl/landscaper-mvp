"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/properties", label: "Properties" },
  { href: "/service-plans", label: "Service Plans" },
  { href: "/service-visits", label: "Service Visits" },
  { href: "/invoices", label: "Invoices" },
  { href: "/communication-log", label: "Communication Log" },
];

const mobilePrimaryNav = [
  { href: "/", label: "Home" },
  { href: "/service-visits", label: "Visits" },
  { href: "/properties", label: "Properties" },
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeLabel = useMemo(() => {
    const item = navItems.find((navItem) => isActive(pathname, navItem.href));
    return item?.label ?? "Landscaping Ops";
  }, [pathname]);

  return (
    <>
      <header className="hidden border-b border-emerald-200/80 bg-white/85 shadow-sm backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <div className="mr-4 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
            Landscaping Ops
          </div>
          <nav className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  isActive(pathname, item.href)
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "border border-emerald-200 bg-white/70 text-zinc-700 hover:bg-emerald-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <header className="sticky top-0 z-40 border-b border-emerald-200/70 bg-gradient-to-r from-[#5aaf61] to-[#2f8a46] text-white shadow-sm backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/90">
              Landscaping Ops
            </p>
            <p className="text-sm font-semibold text-white">{activeLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            Menu
          </button>
        </div>
      </header>

      {isMenuOpen ? (
        <div
          className="fixed inset-0 z-50 bg-zinc-900/35 md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        >
          <div
            id="mobile-nav-menu"
            className="mx-4 mt-20 rounded-2xl border border-emerald-200 bg-white/95 p-2 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block rounded-xl px-3 py-3 text-sm font-semibold ${
                  isActive(pathname, item.href)
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-800 hover:bg-emerald-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 bg-[#edf4ee]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-1 py-2 text-center text-[11px] font-semibold transition ${
                isActive(pathname, item.href)
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-700 hover:bg-emerald-100/70"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
