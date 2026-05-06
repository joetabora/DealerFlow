"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/scheduler", label: "Scheduler" },
  { href: "/media", label: "Media" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col border-r border-gray-200 bg-white md:flex">
      <div className="border-b border-gray-100 px-4 py-4">
        <Link href="/" className="block leading-tight">
          <span className="text-base font-semibold tracking-tight text-gray-900">
            DealerFlow
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            Inventory &amp; social
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/inventory"
                ? pathname === "/inventory" || pathname.startsWith("/bikes/")
                : item.href === "/media"
                  ? pathname === "/media" || pathname === "/import/csv"
                  : item.href === "/leaderboard"
                    ? pathname === "/leaderboard"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-sm text-gray-700 transition",
                active
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 p-2.5">
        <button
          type="button"
          disabled={signingOut}
          onClick={() => void signOut()}
          className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
