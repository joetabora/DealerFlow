"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Clears document-level locks that survive client navigations (e.g. scroll lock after
 * a full-screen preview or rare DnD-kit cleanup gaps) so taps/clicks keep working.
 */
export function NavigationBodyUnlock() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const b = document.body;
    const html = document.documentElement;
    b.style.removeProperty("overflow");
    b.style.removeProperty("padding-right"); /* radix-style scroll-gap */
    html.style.removeProperty("overflow");
    b.style.cursor = "";
    b.style.userSelect = "";
    b.style.removeProperty("pointer-events"); /* seldom set, harmless if absent */
  }, [pathname]);

  return null;
}
