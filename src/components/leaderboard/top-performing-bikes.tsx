"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { repostBike } from "@/app/leaderboard/actions";
import { buttonSecondary } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { BrowserImage } from "@/components/media/browser-image";
import { ExpandableMedia } from "@/components/media/media-lightbox";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { LeaderboardRow } from "@/lib/leaderboard-data";

export function TopPerformingBikes({
  rows,
  error,
}: {
  rows: LeaderboardRow[];
  error: string | null;
}) {
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  function onRepost(postId: string) {
    setActiveId(postId);
    startTransition(async () => {
      try {
        const r = await repostBike(postId);
        if (r.ok) {
          show("Repost scheduled", "success");
        } else if (r.reason === "recent") {
          show("Recently posted", "error");
        } else {
          show(r.message, "error");
        }
      } finally {
        setActiveId(null);
      }
    });
  }

  if (error === "config") {
    return null;
  }

  return (
    <Card className="overflow-hidden !p-0">
      <div className="border-b border-gray-100 px-5 py-4">
        <CardTitle className="!text-lg">Top performing bikes</CardTitle>
        <p className="mt-0.5 text-sm text-gray-600">
          Posted content ranked by engagement (likes + comments × 2).
        </p>
      </div>
      {error ? (
        <p className="px-5 py-4 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">
          No posted performance yet. When posts are marked posted with likes and
          comments, they appear here.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li
              key={row.postId}
              className="group transition-colors duration-200 hover:bg-gray-50/90"
            >
              <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-14 sm:w-14">
                  {row.thumbUrl ? (
                    <ExpandableMedia
                      type="image"
                      src={row.thumbUrl}
                      className="h-full w-full"
                      triggerClassName="h-full w-full"
                    >
                      <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
                        <div className="absolute inset-0 box-border flex min-h-0 min-w-0 items-center justify-center p-px">
                          <BrowserImage
                            src={row.thumbUrl}
                            alt=""
                            className="h-auto max-h-full w-auto max-w-full object-contain transition duration-200 group-hover:scale-105"
                          />
                        </div>
                      </div>
                    </ExpandableMedia>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900 sm:text-[15px]">
                      {row.title}
                    </p>
                    {row.showHotSuggestion ? (
                      <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        🔥 Performing well
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-gray-500">{row.location}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Posted {row.postedAtLabel} ·{" "}
                    <span className="font-medium text-gray-700">
                      {row.likes} likes
                    </span>
                    ,{" "}
                    <span className="font-medium text-gray-700">
                      {row.comments} comments
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <p
                    className="text-lg font-bold tabular-nums text-gray-900 sm:text-xl"
                    title="Engagement score"
                  >
                    {row.engagementScore}
                  </p>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onRepost(row.postId)}
                    className={cn(
                      buttonSecondary,
                      "min-h-9 min-w-[4.5rem] whitespace-nowrap px-3 text-xs font-medium active:scale-[0.97] sm:text-sm",
                    )}
                  >
                    {isPending && activeId === row.postId ? "…" : "Repost"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!error && rows.length > 0 ? (
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          Scores use{" "}
          <span className="font-medium text-gray-700">likes + comments × 2</span>.{" "}
          <Link
            href="/scheduler"
            className="font-medium text-gray-800 underline decoration-gray-300 underline-offset-2"
          >
            Scheduler
          </Link>{" "}
          for the full week.
        </p>
      ) : null}
    </Card>
  );
}
