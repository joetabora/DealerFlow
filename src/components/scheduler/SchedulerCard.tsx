"use client";

import { type CSSProperties, forwardRef } from "react";
import { BrowserImage } from "@/components/media/browser-image";
import { ExpandableMedia } from "@/components/media/media-lightbox";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import type { SchedulerCell } from "@/types/scheduler";

const statusVariant: Record<string, "scheduled" | "default" | "available"> = {
  scheduled: "scheduled",
  draft: "default",
  posted: "available",
};

type Props = {
  cell: SchedulerCell;
  className?: string;
  style?: CSSProperties;
  dimmed?: boolean;
  /** e.g. "9:00 AM" for the slot */
  timeLabel?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const SchedulerCard = forwardRef<HTMLDivElement, Props>(function SchedulerCard(
  { cell, className, style, dimmed, timeLabel, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition duration-200",
        "min-h-[4.5rem] active:scale-[0.99] sm:min-h-0",
        "max-md:px-3.5 max-md:py-3.5",
        dimmed && "opacity-35",
        className,
      )}
      {...rest}
    >
      <div className="group/image relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-16 sm:w-16">
        {cell.thumbUrl ? (
          <ExpandableMedia
            type="image"
            src={cell.thumbUrl}
            className="h-full w-full"
            triggerClassName="h-full w-full"
          >
            <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
              <div className="absolute inset-0 box-border flex min-h-0 min-w-0 items-center justify-center p-px">
                <BrowserImage
                  src={cell.thumbUrl}
                  alt=""
                  className="h-auto max-h-full w-auto max-w-full object-contain transition duration-200 will-change-transform group-hover/image:scale-105"
                />
              </div>
            </div>
          </ExpandableMedia>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
            No photo
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 pr-1">
        {timeLabel ? (
          <p className="text-[10px] leading-tight text-gray-400 max-md:mb-0.5">
            <span className="font-medium tabular-nums text-gray-500">{timeLabel}</span>
            <span className="text-gray-300"> · </span>
            <span className="text-gray-400">Optimized posting time</span>
          </p>
        ) : (
          <p className="text-[10px] text-gray-400">Optimized posting time</p>
        )}
        <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-900 sm:mt-0 max-md:mt-1 max-md:text-[15px]">
          {cell.title}
        </p>
        <p className="text-xs text-gray-600 sm:mt-0.5 max-md:mt-0.5 max-md:text-sm">
          {cell.price}
        </p>
        <p className="line-clamp-1 text-xs text-gray-500 sm:mt-0 max-md:mt-0.5">
          {cell.location || "—"}
        </p>
      </div>
      <div className="shrink-0 self-start">
        <Badge
          variant={statusVariant[cell.status] ?? "default"}
          className="!px-2 !py-0.5 !text-[10px] min-[480px]:!text-[10px]"
        >
          {cell.status}
        </Badge>
      </div>
    </div>
  );
});
