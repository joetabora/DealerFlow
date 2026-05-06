"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { repostBike } from "@/app/(dashboard)/leaderboard/actions";
import { updatePostEngagement } from "@/app/(dashboard)/scheduler/actions";
import { buttonSecondary } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { BrowserImage } from "@/components/media/browser-image";
import { ExpandableMedia } from "@/components/media/media-lightbox";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { LeaderboardRow } from "@/lib/leaderboard-data";

function EngagementFields({
  row,
  onSaved,
}: {
  row: LeaderboardRow;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [likes, setLikes] = useState(row.likes);
  const [comments, setComments] = useState(row.comments);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updatePostEngagement(row.postId, likes, comments);
      if (r.ok) {
        show("Engagement saved", "success");
        onSaved();
      } else {
        show(r.error, "error");
      }
    });
  }

  return (
    <div className="mt-1.5 flex max-w-sm flex-wrap items-center gap-1.5">
      <label className="flex items-center gap-0.5 text-[10px] text-gray-500">
        Likes
        <input
          type="number"
          min={0}
          className="h-7 w-11 rounded border border-gray-200 px-0.5 text-xs tabular-nums"
          value={likes}
          onChange={(e) => setLikes(Math.max(0, +e.target.value || 0))}
        />
      </label>
      <label className="flex items-center gap-0.5 text-[10px] text-gray-500">
        Comments
        <input
          type="number"
          min={0}
          className="h-7 w-11 rounded border border-gray-200 px-0.5 text-xs tabular-nums"
          value={comments}
          onChange={(e) => setComments(Math.max(0, +e.target.value || 0))}
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="h-7 rounded-md bg-gray-100 px-2 text-[10px] font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
    </div>
  );
}

export function TopPerformingBikes({
  rows,
  error,
  variant = "dashboard",
}: {
  rows: LeaderboardRow[];
  error: string | null;
  variant?: "dashboard" | "page";
}) {
  const { show } = useToast();
  const router = useRouter();
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
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <CardTitle className="!text-lg">Top performing bikes</CardTitle>
            <p className="mt-0.5 text-sm text-gray-600">
              Ranked by engagement (likes + comments × 2). Enter metrics from
              your social app, then save.
            </p>
          </div>
          {variant === "dashboard" ? (
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
            >
              Full leaderboard
            </Link>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="px-5 py-4 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">
          No posted content in this range. Mark posts as posted, add likes and
          comments, then save.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li
              key={row.postId}
              className="group transition-colors duration-200 hover:bg-gray-50/90"
            >
              <div className="flex flex-col gap-2 px-4 py-3 sm:px-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-14 sm:w-14">
                    {row.thumbUrl ? (
                      <ExpandableMedia
                        type="image"
                        src={row.thumbUrl}
                        className="h-full w-full"
                        triggerClassName="h-full w-full"
                      >
                        <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
                          <BrowserImage
                            src={row.thumbUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-contain transition duration-200 group-hover:scale-105"
                          />
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
                          Suggested to repost
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-gray-500">{row.location}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Posted {row.postedAtLabel} · score{" "}
                      <span className="font-medium text-gray-800">
                        {row.engagementScore}
                      </span>
                    </p>
                    <EngagementFields
                      key={`${row.postId}-${row.likes}-${row.comments}`}
                      row={row}
                      onSaved={() => router.refresh()}
                    />
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
              </div>
            </li>
          ))}
        </ul>
      )}
      {!error && rows.length > 0 ? (
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span className="font-medium text-gray-700">likes + comments × 2</span>.{" "}
          <Link
            href="/scheduler"
            className="font-medium text-gray-800 underline decoration-gray-300 underline-offset-2"
          >
            Scheduler
          </Link>{" "}
          for the week.
        </p>
      ) : null}
    </Card>
  );
}
