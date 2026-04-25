"use client";

import { type CSSProperties, forwardRef } from "react";
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
} & React.HTMLAttributes<HTMLDivElement>;

export const SchedulerCard = forwardRef<HTMLDivElement, Props>(function SchedulerCard(
  { cell, className, style, dimmed, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "flex w-full min-w-0 cursor-grab items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm",
        "active:cursor-grabbing",
        dimmed && "opacity-35",
        className,
      )}
      {...rest}
    >
      <div className="group/image relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {cell.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cell.thumbUrl}
            alt=""
            className="h-full w-full object-cover transition duration-200 will-change-transform group-hover/image:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
            No photo
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 pr-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-900">
          {cell.title}
        </p>
        <p className="text-xs text-gray-600">{cell.price}</p>
        <p className="line-clamp-1 text-xs text-gray-500">
          {cell.location || "—"}
        </p>
      </div>
      <div className="shrink-0 self-start">
        <Badge
          variant={statusVariant[cell.status] ?? "default"}
          className="!px-1.5 !py-0.5 !text-[10px]"
        >
          {cell.status}
        </Badge>
      </div>
    </div>
  );
});
