import Link from "next/link";
import type { InventoryBike } from "@/lib/inventory-list";
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
    <Link
      href={`/bikes/${bike.id}`}
      className="group block overflow-hidden transition-transform duration-200 hover:scale-[1.01]"
    >
      <CardShell
        className="h-full overflow-hidden bg-white"
        hover
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          {bike.heroUrl && bike.heroIsVideo ? (
            <video
              src={bike.heroUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : bike.heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bike.heroUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-xs font-medium text-gray-400">No media</span>
            </div>
          )}
          {bike.hasVideo ? (
            <span className="absolute left-2 top-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Video
            </span>
          ) : null}
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
            {bike.title ?? "Untitled"}
          </h3>
          <p className="mt-1.5 text-base font-semibold tabular-nums text-gray-900">
            {bike.price ?? "—"}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="max-w-[55%] truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs leading-tight text-gray-700">
              {bike.location?.trim() || "—"}
            </span>
            <Badge
              variant={bike.status === "available" ? "available" : "sold"}
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
            <span className="text-xs font-medium text-gray-600 transition group-hover:text-black">
              View
            </span>
          </div>
        </div>
      </CardShell>
    </Link>
  );
}
