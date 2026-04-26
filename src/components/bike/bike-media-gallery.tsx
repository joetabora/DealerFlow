"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBikeMedia } from "@/app/bikes/[id]/actions";
import { BrowserImage } from "@/components/media/browser-image";
import { useToast } from "@/components/ui/toast";
import type { BikeMedia } from "@/types/bike";

type Props = { bikeId: string; media: BikeMedia[] };

export function BikeMediaGallery({ bikeId, media }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function onDelete(m: BikeMedia) {
    if (
      !confirm(
        "Remove this file from the bike? It will be deleted from storage. This cannot be undone.",
      )
    ) {
      return;
    }
    setDeletingId(m.id);
    startTransition(async () => {
      const r = await deleteBikeMedia(m.id, bikeId);
      setDeletingId(null);
      if (r.ok) {
        show("Media removed", "success");
        router.refresh();
      } else {
        show(r.error, "error");
      }
    });
  }

  if (media.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-medium leading-tight text-gray-800">Media</h2>
      <ul className="mt-3 grid list-none gap-3 sm:grid-cols-2">
        {media.map((m) => {
          const v = m.type === "video" ? m.status : undefined;
          const busy = isPending && deletingId === m.id;
          return (
            <li key={m.id}>
              <div className="space-y-1.5">
                {m.type === "video" && v ? (
                  <p
                    className={
                      "text-xs font-medium " +
                      (v === "failed"
                        ? "text-red-600"
                        : v === "processing"
                          ? "text-amber-700"
                          : "text-emerald-600")
                    }
                  >
                    {v === "processing" && "Processing video…"}
                    {v === "ready" && "Ready"}
                    {v === "failed" &&
                      (m.processing_error
                        ? `Failed: ${m.processing_error.slice(0, 100)}${(m.processing_error?.length ?? 0) > 100 ? "…" : ""}`
                        : "Failed")}
                  </p>
                ) : null}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {m.type === "image" ? (
                    <BrowserImage
                      src={m.file_url}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <video
                      src={m.file_url}
                      controls
                      className="aspect-[4/3] w-full object-cover"
                    />
                  )}
                  <div className="absolute right-2 top-2 z-10">
                    <button
                      type="button"
                      onClick={() => onDelete(m)}
                      disabled={isPending}
                      className="rounded-lg border border-white/20 bg-red-600/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition hover:bg-red-700 disabled:opacity-50"
                      aria-label="Delete this media file"
                    >
                      {busy ? "Removing…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
