"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { buttonPrimary, buttonSecondary } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { SchedulerCell } from "@/types/scheduler";

type Props = {
  open: boolean;
  onClose: () => void;
  cell: SchedulerCell;
  timeLabel: string;
  /** Return a promise; parent shows toast and reloads */
  onSave: (caption: string) => void | Promise<void>;
  /** Optional: parent runs server action; dialog shows spinner */
  onMarkPosted?: () => void | Promise<void>;
};

/**
 * View/edit one scheduled post. Drag remains on a separate handle on the card so
 * the main surface can open this dialog.
 */
export function SchedulerPostDialog({
  open,
  onClose,
  cell,
  timeLabel,
  onSave,
  onMarkPosted,
}: Props) {
  const { show } = useToast();
  const [text, setText] = useState(cell.caption ?? "");
  const [pending, start] = useTransition();
  const [postedPending, startPosted] = useTransition();
  const idBase = useId();
  const capId = `${idBase}-cap`;

  async function handleCopyForPosting() {
    const cap = text.trim();
    const urlPart = cell.thumbUrl ?? "";
    const pack = urlPart ? `${cap}\n\n${urlPart}` : cap;
    try {
      await navigator.clipboard.writeText(pack);
      show("Caption and hero URL copied to clipboard.", "success");
    } catch {
      show("Could not copy — try copying from the caption field manually.", "error");
    }
  }


  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[min(90dvh,36rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={`${idBase}-title`}
          className="text-base font-semibold leading-snug text-gray-900"
        >
          {cell.title}
        </h2>
        <p className="mt-0.5 text-sm text-gray-600">{cell.price}</p>
        <p className="text-sm text-gray-500">{cell.location || "—"}</p>
        <p className="mt-2 text-xs text-gray-400">Time: {timeLabel}</p>
        <p className="text-xs text-gray-400">Status: {cell.status}</p>
        <div className="mt-3">
          <label htmlFor={capId} className="text-xs font-medium text-gray-500">
            Caption
          </label>
          <textarea
            id={capId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200"
            placeholder="Write the post copy (title, price, location, call to action…)."
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Tip: use the <span className="font-medium">⋮⋮</span> grip to drag; click
          the card to edit here.
        </p>
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Manual posting (Meta, etc.)
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonSecondary + " text-sm"}
              disabled={pending || postedPending}
              onClick={() => void handleCopyForPosting()}
            >
              Copy caption &amp; hero URL
            </button>
            {cell.postId?.trim() && onMarkPosted ? (
              <button
                type="button"
                className={buttonPrimary + " text-sm"}
                disabled={pending || postedPending}
                onClick={() => {
                  startPosted(async () => {
                    await onMarkPosted();
                  });
                }}
              >
                {postedPending ? "Updating…" : "Mark as posted"}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            After you publish externally, mark the slot as posted so engagement on the leaderboard
            lines up with real posts.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/bikes/${cell.bikeId}`}
            className={buttonSecondary + " text-sm"}
            onClick={onClose}
          >
            Open bike
          </Link>
          <button
            type="button"
            className={buttonSecondary}
            onClick={onClose}
            disabled={pending || postedPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={buttonPrimary}
            disabled={pending || postedPending}
            onClick={() => {
              start(async () => {
                await onSave(text);
              });
            }}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
