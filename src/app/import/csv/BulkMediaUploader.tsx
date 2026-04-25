"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readDropDataTransfer } from "@/lib/inventory/readDropDataTransfer";
import {
  isVideoFile,
  resolveStockForMedia,
  safeStorageFileName,
} from "@/lib/inventory/matchFileToStock";

type SkuId = { sku: string; id: string };

type UploadStatus =
  | { name: string; state: "ok" | "err"; detail?: string }
  | { name: string; state: "skip"; detail: string };

export function BulkMediaUploader() {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [skus, setSkus] = useState<SkuId[] | null>(null);
  const [log, setLog] = useState<UploadStatus[] | null>(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    setWorking(true);
    const list = skus.map((s) => s.sku);
    const idBy = new Map(skus.map((r) => [r.sku, r.id] as const));
    const s = createClient();
    const results: UploadStatus[] = [];
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
        const mtype = isVideoFile(file) ? "video" : "image";
        const { error: ins } = await s.from("media").insert({
          bike_id: bikeId,
          file_url: publicUrl,
          type: mtype,
        });
        if (ins) {
          results.push({ name: display, state: "err", detail: ins.message });
          continue;
        }
        results.push({ name: display, state: "ok" });
      }
      setLog(results);
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
    <div className="space-y-3">
      <div
        onDragOver={onDragOver}
        onDrop={(e) => {
          void onDrop(e);
        }}
        className="relative rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 dark:border-zinc-700 dark:bg-zinc-950/50"
      >
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Drag and drop</strong> one or more{" "}
          <strong>folders</strong> named with the stock number (e.g.{" "}
          <code className="text-xs">U612099-MKE</code> with images inside), or a
          parent folder that contains those stock folders. You can also drop
          individual files; matching still uses a stock prefix on the name if
          the path is flat.
        </p>
        <p className="mt-2 text-center text-xs text-zinc-500">
          Chrome or Edge work best for folder drops.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Files
          </label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            disabled={working}
            onChange={(e) => void onFiles(e.target.files)}
            className="mt-1 block text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Or folder
          </label>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            disabled={working}
            onChange={(e) => void onFiles(e.target.files)}
            className="mt-1 block text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
        >
          Refresh stock list
        </button>
      </div>
      {skus && (
        <p className="text-xs text-zinc-500">
          Loaded {skus.length} stock number(s) from the database.
        </p>
      )}
      {err && (
        <p className="text-sm text-red-700 dark:text-red-400">{err}</p>
      )}
      {working && <p className="text-sm">Uploading…</p>}
      {log && log.length > 0 && (
        <ul className="max-h-60 overflow-y-auto rounded border border-zinc-200 text-xs dark:border-zinc-800">
          {log.map((l, i) => (
            <li
              key={i}
              className="border-b border-zinc-100 px-2 py-1 font-mono last:border-0 dark:border-zinc-900"
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
              {l.name}
              {l.detail ? ` — ${l.detail}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
