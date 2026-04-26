"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buttonSecondary } from "@/components/ui/button";
import { readDropDataTransfer } from "@/lib/inventory/readDropDataTransfer";
import {
  isVideoFile,
  resolveStockForMedia,
  safeStorageFileName,
} from "@/lib/inventory/matchFileToStock";
import {
  transcodeVideoInBrowser,
  useClientFfmpegEnabled,
} from "@/lib/video/client-transcode";
import { store720pFromBrowser } from "@/lib/video/store-browser-720p";
import {
  getMaxDirectVideoUploadBytes,
} from "@/lib/video/upload-policy";

type SkuId = { sku: string; id: string };

type UploadStatus =
  | { name: string; state: "ok" | "err" | "skip"; detail?: string }
  | {
      name: string;
      state: "video";
      mediaId: string;
      job: "processing" | "ready" | "failed";
      detail?: string;
    };

const POLL_MS = 2000;
const POLL_MAX = 90;

export function BulkMediaUploader() {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [skus, setSkus] = useState<SkuId[] | null>(null);
  const [log, setLog] = useState<UploadStatus[] | null>(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pendingVideoIds, setPendingVideoIds] = useState<string[]>([]);
  const pollCount = useRef(0);
  const useClientFfmpeg = useClientFfmpegEnabled();

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const s = createClient();
      const { data, error } = await s.from("bikes").select("id, sku");
      if (error) throw error;
      setSkus(
        (data as SkuId[] | null)
          ?.map((r) => ({ id: r.id, sku: r.sku.trim() }))
          .filter((r) => r.sku) ?? [],
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load bikes");
      setSkus([]);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  // Poll server-side transcode job status
  useEffect(() => {
    if (pendingVideoIds.length === 0) {
      pollCount.current = 0;
      return;
    }
    if (pollCount.current >= POLL_MAX) {
      setLog((L) => {
        if (!L) return L;
        return L.map((r) => {
          if (r.state !== "video" || r.job !== "processing") return r;
          if (pendingVideoIds.includes(r.mediaId)) {
            return {
              ...r,
              job: "failed" as const,
              detail: "Status timeout — refresh the page to check",
            };
          }
          return r;
        });
      });
      setPendingVideoIds([]);
      return;
    }

    const t = setInterval(() => {
      void (async () => {
        const s = createClient();
        const { data, error } = await s
          .from("media")
          .select("id, status, processing_error")
          .in("id", pendingVideoIds);
        if (error) return;
        const rows = (data ?? []) as {
          id: string;
          status: string;
          processing_error: string | null;
        }[];
        const done = new Set<string>();
        setLog((L) => {
          if (!L) return L;
          return L.map((r) => {
            if (r.state !== "video" || r.job !== "processing") return r;
            const row = rows.find((x) => x.id === r.mediaId);
            if (!row) return r;
            if (row.status === "ready")
              return { ...r, job: "ready" as const, detail: "Compressed" };
            if (row.status === "failed")
              return {
                ...r,
                job: "failed" as const,
                detail: row.processing_error || "Error",
              };
            return r;
          });
        });
        for (const row of rows) {
          if (row.status === "ready" || row.status === "failed")
            done.add(row.id);
        }
        if (done.size) {
          setPendingVideoIds((ids) => {
            const next = ids.filter((id) => !done.has(id));
            if (next.length < ids.length) pollCount.current = 0;
            return next;
          });
        }
        pollCount.current += 1;
      })();
    }, POLL_MS);

    return () => clearInterval(t);
  }, [pendingVideoIds]);

  async function processMediaItems(
    items: { file: File; relPath: string }[],
  ) {
    if (items.length === 0) return;
    if (!skus?.length) {
      setErr("No bikes in the database. Import a CSV first.");
      return;
    }
    setLog([]);
    setErr(null);
    setPendingVideoIds([]);
    pollCount.current = 0;
    setWorking(true);
    const list = skus.map((s) => s.sku);
    const idBy = new Map(skus.map((r) => [r.sku, r.id] as const));
    const s = createClient();
    const results: UploadStatus[] = [];
    const newPending: string[] = [];
    const clientMode = useClientFfmpeg;
    const maxDirectBytes = getMaxDirectVideoUploadBytes();

    function isStorageSizeRejection(message: string): boolean {
      return /exceeded|maximum|too large|size limit/i.test(message);
    }

    function storageErrDetail(message: string): string {
      if (isStorageSizeRejection(message)) {
        return `${message} (Try raising the limit in Supabase → Project Settings → Storage, or set NEXT_PUBLIC_MAX_DIRECT_VIDEO_UPLOAD_MB to match your cap so we compress in-browser first.)`;
      }
      return message;
    }

    try {
      for (const { file, relPath } of items) {
        const display = relPath;
        const sku = resolveStockForMedia(relPath, file.name, list);
        if (!sku) {
          results.push({
            name: display,
            state: "skip",
            detail: "no matching stock in path or file name",
          });
          continue;
        }
        const bikeId = idBy.get(sku);
        if (!bikeId) {
          results.push({ name: display, state: "skip", detail: "unknown stock" });
          continue;
        }
        const objectName = `${Date.now()}-${safeStorageFileName(file.name)}`;
        const path = `${encodeURIComponent(sku)}/${objectName}`;
        const isVideo = isVideoFile(file);

        if (isVideo && file.size > maxDirectBytes) {
          const r = await store720pFromBrowser(s, {
            bikeId,
            sku,
            objectName,
            file,
            maxOutputBytes: maxDirectBytes,
          });
          if (r.ok) {
            results.push({
              name: display,
              state: "video",
              mediaId: r.mediaId,
              job: "ready",
              detail:
                "720p in browser, then stored (avoids Supabase’s max file size on the full original)",
            });
            continue;
          }
          results.push({ name: display, state: "err", detail: r.error });
          continue;
        }

        if (isVideo && clientMode && file.size <= maxDirectBytes) {
          try {
            const blob = await transcodeVideoInBrowser(file);
            const origStoragePath = `${encodeURIComponent(sku)}/o-${objectName}`;
            const compStoragePath = `${encodeURIComponent(sku)}/c-${objectName}.mp4`;
            const { error: upOrig } = await s.storage
              .from("bike-media")
              .upload(origStoragePath, file, {
                upsert: true,
                contentType: file.type || "video/mp4",
              });
            if (upOrig) {
              results.push({
                name: display,
                state: "err",
                detail: storageErrDetail(upOrig.message),
              });
              continue;
            }
            const { data: origPub } = s.storage
              .from("bike-media")
              .getPublicUrl(origStoragePath);
            const { error: upC } = await s.storage
              .from("bike-media")
              .upload(compStoragePath, blob, {
                upsert: true,
                contentType: "video/mp4",
              });
            if (upC) {
              results.push({
                name: display,
                state: "err",
                detail: storageErrDetail(upC.message),
              });
              continue;
            }
            const { data: cPub } = s.storage
              .from("bike-media")
              .getPublicUrl(compStoragePath);
            const { data: insRow, error: ins } = await s
              .from("media")
              .insert({
                bike_id: bikeId,
                file_url: cPub.publicUrl,
                type: "video",
                status: "ready",
                original_url: origPub.publicUrl,
                compressed_url: cPub.publicUrl,
              })
              .select("id")
              .single();
            if (ins) {
              results.push({ name: display, state: "err", detail: ins.message });
              continue;
            }
            results.push({
              name: display,
              state: "video",
              mediaId: insRow!.id,
              job: "ready",
              detail: "Client compressed (720p)",
            });
            continue;
          } catch (e) {
            console.warn("Client transcode failed, using server", e);
            /* fall through to server upload + async transcode */
          }
        }

        if (isVideo) {
          const { error: up } = await s.storage
            .from("bike-media")
            .upload(path, file, {
              upsert: true,
              contentType: file.type || undefined,
            });
          if (up) {
            if (isStorageSizeRejection(up.message)) {
              const r2 = await store720pFromBrowser(s, {
                bikeId,
                sku,
                objectName,
                file,
                maxOutputBytes: maxDirectBytes,
              });
              if (r2.ok) {
                results.push({
                  name: display,
                  state: "video",
                  mediaId: r2.mediaId,
                  job: "ready",
                  detail: "Direct upload was over your storage limit, so 720p was used in the browser",
                });
                continue;
              }
            }
            results.push({
              name: display,
              state: "err",
              detail: storageErrDetail(up.message),
            });
            continue;
          }
          const { data: pub } = s.storage.from("bike-media").getPublicUrl(path);
          const publicUrl = pub.publicUrl;
          const { data: insData, error: ins } = await s
            .from("media")
            .insert({
              bike_id: bikeId,
              file_url: publicUrl,
              type: "video",
              status: "processing",
              original_url: publicUrl,
            })
            .select("id")
            .single();
          if (ins) {
            results.push({ name: display, state: "err", detail: ins.message });
            continue;
          }
          const mediaId = insData!.id;
          newPending.push(mediaId);
          results.push({
            name: display,
            state: "video",
            mediaId,
            job: "processing",
            detail: "Uploading — compressing in background",
          });
          void fetch("/api/media/process-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaId }),
          });
          continue;
        }

        const { error: up } = await s.storage
          .from("bike-media")
          .upload(path, file, {
            upsert: true,
            contentType: file.type || undefined,
          });
        if (up) {
          results.push({ name: display, state: "err", detail: up.message });
          continue;
        }
        const { data: pub } = s.storage.from("bike-media").getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        const { error: ins } = await s.from("media").insert({
          bike_id: bikeId,
          file_url: publicUrl,
          type: "image",
          status: "ready",
          original_url: publicUrl,
        });
        if (ins) {
          results.push({ name: display, state: "err", detail: ins.message });
          continue;
        }
        results.push({ name: display, state: "ok" });
      }
      setLog(results);
      if (newPending.length) {
        setPendingVideoIds((p) => [...p, ...newPending]);
        pollCount.current = 0;
      }
    } finally {
      setWorking(false);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const items = Array.from(files).map((f) => ({
      file: f,
      relPath:
        f.webkitRelativePath && f.webkitRelativePath.length > 0
          ? f.webkitRelativePath
          : f.name,
    }));
    await processMediaItems(items);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types?.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const items = await readDropDataTransfer(e.dataTransfer);
      await processMediaItems(items);
    } catch (err) {
      setErr(
        err instanceof Error
          ? err.message
          : "Could not read dropped folder (try a different browser or use the file picker).",
      );
    }
  }

  return (
    <div className="space-y-2.5">
      <div
        onDragOver={onDragOver}
        onDrop={(e) => {
          void onDrop(e);
        }}
        className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8"
      >
        <p className="text-center text-sm text-gray-600">
          <strong>Drag and drop</strong> one or more{" "}
          <strong>folders</strong> named with the stock number (e.g.{" "}
          <code className="text-xs">U612099-MKE</code> with images inside), or a
          parent folder that contains those stock folders. You can also drop
          individual files; matching still uses a stock prefix on the name if
          the path is flat.
        </p>
        <p className="mt-2 text-center text-xs text-gray-500">
          Chrome or Edge work best for folder drops. Videos over{" "}
          {(getMaxDirectVideoUploadBytes() / (1024 * 1024)).toFixed(0)}MB (see{" "}
          <code className="text-[10px]">NEXT_PUBLIC_MAX_DIRECT_VIDEO_UPLOAD_MB</code>
          ) are compressed in the browser to 720p, then the smaller file is
          uploaded so it fits typical Supabase Storage limits. Smaller videos can
          upload as-is, then the server can transcode in the background (if FFmpeg
          is available). {useClientFfmpeg ? " Optional env also forces in-browser 720p for all sizes." : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Files
          </label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            disabled={working}
            onChange={(e) => void onFiles(e.target.files)}
            className="mt-0.5 block w-full min-w-0 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Or folder
          </label>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            disabled={working}
            onChange={(e) => void onFiles(e.target.files)}
            className="mt-0.5 block w-full min-w-0 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className={buttonSecondary}
        >
          Refresh stock list
        </button>
      </div>
      {skus && (
        <p className="text-xs text-gray-500">
          Loaded {skus.length} stock number(s) from the database.
        </p>
      )}
      {err && <p className="text-sm text-red-700">{err}</p>}
      {working && <p className="text-sm">Uploading…</p>}
      {log && log.length > 0 && (
        <ul className="max-h-60 overflow-y-auto rounded-2xl border border-gray-200 text-xs">
          {log.map((l, i) => (
            <li
              key={i}
              className="border-b border-gray-100 px-2 py-1 font-mono last:border-0"
            >
              {l.state === "ok" && (
                <span className="text-emerald-600">ok</span>
              )}{" "}
              {l.state === "err" && (
                <span className="text-red-600">err</span>
              )}{" "}
              {l.state === "skip" && (
                <span className="text-amber-600">skip</span>
              )}{" "}
              {l.state === "video" && (
                <span
                  className={
                    l.job === "ready"
                      ? "text-emerald-600"
                      : l.job === "failed"
                        ? "text-red-600"
                        : "text-amber-600"
                  }
                >
                  {l.job === "processing" && "video (processing…)"}
                  {l.job === "ready" && "video (ready)"}
                  {l.job === "failed" && "video (failed)"}
                </span>
              )}{" "}
              {l.name}
              {l.detail ? ` — ${l.detail}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
