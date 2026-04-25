"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/scheduler", label: "Scheduler" },
  { href: "/media", label: "Media" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[240px] flex-col border-r border-gray-200 bg-white">
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
      <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/inventory"
                ? pathname === "/inventory" || pathname.startsWith("/bikes/")
                : item.href === "/media"
                  ? pathname === "/media" || pathname === "/import/csv"
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
    </aside>
  );
}
