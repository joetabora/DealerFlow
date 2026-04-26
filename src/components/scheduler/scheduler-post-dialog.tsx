"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/components/ui/button";
import type { SchedulerCell } from "@/types/scheduler";

type Props = {
  open: boolean;
  onClose: () => void;
  cell: SchedulerCell;
  timeLabel: string;
  /** Return a promise; parent shows toast and reloads */
  onSave: (caption: string) => void | Promise<void>;
};

/**
 * View/edit one scheduled post. Drag remains on a separate handle on the card so
 * the main surface can open this dialog.
 */
export function SchedulerPostDialog({ open, onClose, cell, timeLabel, onSave }: Props) {
  const [text, setText] = useState(cell.caption ?? "");
  const [pending, start] = useTransition();
  const idBase = useId();
  const capId = `${idBase}-cap`;

  useEffect(() => {
    if (open) setText(cell.caption ?? "");
  }, [open, cell.caption, cell.postId, cell.bikeId]);

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
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={buttonPrimary}
            disabled={pending}
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
