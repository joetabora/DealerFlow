"use client";

import Link from "next/link";
import type { InventoryBike } from "@/lib/inventory-list";
import { BrowserImage } from "@/components/media/browser-image";
import { ExpandableMedia } from "@/components/media/media-lightbox";
import { Badge } from "@/components/ui/badge";
import { CardShell } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Props = { bike: InventoryBike };

export function InventoryBikeCard({ bike }: Props) {
  const postedText =
    bike.post_count > 0
      ? `Posted ${bike.post_count}×`
      : "Never posted";
  const statusLabel =
    bike.status === "sold" ? "Sold" : "Available";

  return (
    <CardShell
      className={cn(
        "group/card h-full overflow-hidden bg-white",
        "transition-all duration-200 active:scale-[0.97] sm:hover:scale-[1.01] sm:hover:-translate-y-px",
      )}
      hover
    >
      <div className="relative aspect-[16/10] w-full min-h-52 max-md:min-h-56 sm:aspect-[4/3] sm:min-h-0">
        {bike.heroUrl && bike.heroIsVideo ? (
          <ExpandableMedia
            type="video"
            src={bike.heroUrl}
            className="h-full w-full"
            triggerClassName="h-full w-full"
          >
            <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden bg-zinc-100">
              <div className="absolute inset-0 box-border flex min-h-0 min-w-0 items-center justify-center p-0.5">
                <video
                  src={bike.heroUrl}
                  className="h-auto max-h-full w-auto max-w-full object-contain transition duration-200 group-hover/card:scale-105"
                  muted
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>
          </ExpandableMedia>
        ) : bike.heroUrl ? (
          <ExpandableMedia
            type="image"
            src={bike.heroUrl}
            className="h-full w-full"
            triggerClassName="h-full w-full"
          >
            <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden bg-zinc-100">
              <div className="absolute inset-0 box-border flex min-h-0 min-w-0 items-center justify-center p-0.5">
                <BrowserImage
                  src={bike.heroUrl}
                  alt=""
                  className="h-auto max-h-full w-auto max-w-full object-contain transition duration-200 group-hover/card:scale-105"
                />
              </div>
            </div>
          </ExpandableMedia>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-xs font-medium text-gray-400">No media</span>
          </div>
        )}
        {bike.hasVideo ? (
          <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Video
          </span>
        ) : null}
      </div>
      <Link
        href={`/bikes/${bike.id}`}
        className="block p-4 max-md:p-5 max-md:pt-4"
      >
        <h3 className="text-sm font-semibold leading-snug text-gray-900 line-clamp-2 max-md:text-base">
          {bike.title ?? "Untitled"}
        </h3>
        <p className="mt-1.5 text-base font-semibold tabular-nums text-gray-900 max-md:text-lg">
          {bike.price ?? "—"}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 max-md:mt-3.5">
          <span className="min-h-8 max-w-[55%] truncate rounded-full bg-gray-100 px-3 py-1 text-xs leading-tight text-gray-700 max-md:py-1.5 max-md:text-sm">
            {bike.location?.trim() || "—"}
          </span>
          <Badge
            variant={bike.status === "available" ? "available" : "sold"}
            className="min-h-8 shrink-0 px-2.5 py-1 text-xs max-md:px-3 max-md:py-1.5"
          >
            {statusLabel}
          </Badge>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2.5">
          <span
            className={cn(
              "text-xs",
              bike.post_count > 0 ? "text-gray-500" : "text-amber-600",
            )}
          >
            {postedText}
          </span>
          <span className="text-xs font-medium text-gray-600 transition group-hover/card:text-black">
            View
          </span>
        </div>
      </Link>
    </CardShell>
  );
}
