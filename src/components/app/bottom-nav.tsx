"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { SHELL_MAX, SHELL_PX } from "./shell-classnames";

const items = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/inventory", label: "Stock", Icon: IconInventory },
  { href: "/scheduler", label: "Plan", Icon: IconCalendar },
  { href: "/leaderboard", label: "Top", Icon: IconTrophy },
  { href: "/media", label: "Media", Icon: IconMedia },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/inventory") {
    return pathname === "/inventory" || pathname.startsWith("/bikes/");
  }
  if (href === "/media") {
    return (
      pathname === "/media" ||
      pathname === "/import/csv" ||
      pathname.startsWith("/import/")
    );
  }
  if (href === "/leaderboard") {
    return pathname === "/leaderboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      window.location.href = "/login";
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/90 bg-white/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-2px_16px_rgba(0,0,0,0.04)] backdrop-blur-md md:hidden"
      aria-label="Main navigation"
    >
      <div className={cn(SHELL_MAX, SHELL_PX, "flex justify-end pt-2")}>
        <button
          type="button"
          disabled={signingOut}
          onClick={() => void signOut()}
          className="text-[11px] font-medium text-gray-500 underline decoration-gray-300 underline-offset-2 disabled:opacity-50"
        >
          {signingOut ? "…" : "Sign out"}
        </button>
      </div>
      <div
        className={cn(
          SHELL_MAX,
          SHELL_PX,
          "grid h-14 min-h-14 grid-cols-5",
        )}
      >
        {items.map(({ href, label, Icon }) => {
          const on = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-gray-500 transition duration-200 active:scale-[0.97] sm:text-xs",
                on && "text-gray-900",
              )}
            >
              <span
                className={cn(
                  "text-gray-400 transition group-hover:text-gray-600",
                  on && "text-gray-900",
                )}
              >
                <Icon active={on} />
              </span>
              <span className="truncate leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function IconHome({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      className="translate-y-px"
      aria-hidden
    >
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 21.5V14h5v7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconInventory({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      aria-hidden
    >
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="12" width="10" height="8" rx="1.5" />
      <path d="M16 12v8h4" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v3M16 3v3" strokeLinecap="round" />
      <rect x="7" y="13" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTrophy({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      aria-hidden
    >
      <path
        d="M8 4h8v2a4 4 0 0 0 4 4v1H4V10a4 4 0 0 0 4-4V4Z"
        strokeLinejoin="round"
      />
      <path
        d="M10 6V4M14 6V4M9 20h6l-1-4H10l-1 4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMedia({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M3 16l4.5-4.5L11 15l3.5-3.5L21 16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
