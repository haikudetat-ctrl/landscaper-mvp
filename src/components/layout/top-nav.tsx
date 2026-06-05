"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AppRole } from "@/lib/auth/rbac";
import { hasPermission, PERMISSIONS } from "@/lib/auth/rbac";

const navItems = [
  { href: "/", label: "Dashboard", permission: PERMISSIONS.dashboardView },
  { href: "/today", label: "Today's Run", permission: PERMISSIONS.runView },
  { href: "/schedule", label: "Schedule", permission: PERMISSIONS.scheduleView },
  { href: "/clients", label: "Clients", permission: PERMISSIONS.clientsRead },
  { href: "/properties", label: "Properties", permission: PERMISSIONS.propertiesRead },
  { href: "/service-plans", label: "Service Plans", permission: PERMISSIONS.servicePlansRead },
  { href: "/service-visits", label: "Service Visits", permission: PERMISSIONS.serviceVisitsRead },
  { href: "/invoices", label: "Invoices", permission: PERMISSIONS.invoicesRead },
  { href: "/payments", label: "Payments", permission: PERMISSIONS.paymentsRecord },
  { href: "/issues", label: "Issues", permission: PERMISSIONS.runView },
  { href: "/leads", label: "Leads", permission: PERMISSIONS.clientsRead },
];

const mobilePrimaryNav = [
  { href: "/", label: "Home", permission: PERMISSIONS.dashboardView },
  { href: "/today", label: "Today", permission: PERMISSIONS.runView },
  { href: "/schedule", label: "Schedule", permission: PERMISSIONS.scheduleView },
  { href: "/properties", label: "Properties", permission: PERMISSIONS.propertiesRead },
  { href: "/invoices", label: "Invoices", permission: PERMISSIONS.invoicesRead },
  { href: "/payments", label: "Pay", permission: PERMISSIONS.paymentsRecord },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({
  role,
  userEmail,
  organizationName,
}: {
  role: AppRole;
  userEmail: string | null;
  organizationName: string | null;
}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => hasPermission(role, item.permission)),
    [role],
  );
  const visibleMobilePrimaryNav = useMemo(
    () => mobilePrimaryNav.filter((item) => hasPermission(role, item.permission)),
    [role],
  );

  return (
    <>
      <header className="hidden border-b border-[#7d9a79] bg-gradient-to-r from-[#1f4d33] via-[#2a6540] to-[#6f9950] text-white shadow-sm backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <div className="mr-4 flex items-center gap-2">
            <Link href="/" aria-label="Go to home dashboard">
              <Image src="/HDZ_White_FullLogo.svg" alt="HDZ Landscaping" width={112} height={29} className="h-auto w-[112px]" priority />
            </Link>
            <Image
              src="/PoweredByLOAM.svg"
              alt="Powered by LOAM"
              width={69}
              height={11}
              className="h-auto w-[69px] brightness-0 invert opacity-95"
            />
          </div>
          <nav className="flex flex-wrap gap-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  isActive(pathname, item.href)
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "border border-white/35 bg-white/10 text-white hover:bg-white/18"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto mr-2 hidden text-right text-xs text-white/90 lg:block">
            <p>{userEmail ?? "Signed in"}</p>
          </div>
          <SignOutButton className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/18 disabled:opacity-60" />
        </div>
      </header>

      <header className="sticky top-0 z-40 border-b border-[#7d9a79] bg-gradient-to-r from-[#1f4d33] via-[#2a6540] to-[#6f9950] text-white shadow-sm backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center">
            <Link href="/" aria-label="Go to home dashboard">
              <Image src="/HDZ_White_FullLogo.svg" alt="HDZ Landscaping" width={96} height={25} className="h-auto w-[96px]" priority />
            </Link>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="rounded-full border border-[#d6e0cf]/80 bg-[#1d4a32]/45 p-2 shadow-[0_0_0_1px_rgba(220,235,212,0.35),0_0_14px_rgba(167,201,87,0.32)] backdrop-blur transition hover:shadow-[0_0_0_1px_rgba(220,235,212,0.5),0_0_18px_rgba(167,201,87,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8f0df] focus-visible:ring-offset-2 focus-visible:ring-offset-[#285d3a]"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-menu"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <Image
                src="/LOAM_WHITE_Logo.svg"
                alt="LOAM menu"
                width={74}
                height={14}
                className="h-auto w-[74px]"
              />
            </button>
          </div>
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
            className="mx-4 mt-20 rounded-2xl border border-[#9caf9b] bg-[#f3f6f1]/95 p-2 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block rounded-xl px-3 py-3 text-sm font-semibold ${
                  isActive(pathname, item.href)
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-800 hover:bg-[#e2e8df]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <SignOutButton className="mt-2 block w-full rounded-xl border border-[#9caf9b] bg-white px-3 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-[#e2e8df] disabled:opacity-60" />
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 bg-[#e5ebe3]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur md:hidden">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(visibleMobilePrimaryNav.length, 1)}, minmax(0, 1fr))` }}
        >
          {visibleMobilePrimaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-1 py-2 text-center text-[11px] font-semibold transition ${
                isActive(pathname, item.href)
                  ? "border-[0.5px] border-[#a7c957] bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-700 hover:bg-[#dbe4d7]"
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
