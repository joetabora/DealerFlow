"use client";

import { useState, useTransition } from "react";
import { importInventoryCsv, type CsvImportResult } from "./actions";
import { BulkMediaUploader } from "./BulkMediaUploader";

export function InventorySyncClient() {
  const [csvState, setCsvState] = useState<CsvImportResult | null>(null);
  const [mediaKey, setMediaKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function onCsvSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCsvState(null);
    const form = e.currentTarget;
    startTransition(async () => {
      const fd = new FormData(form);
      const r = await importInventoryCsv(fd);
      setCsvState(r);
      if (r.ok) {
        setMediaKey((k) => k + 1);
      }
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          1. Import inventory (CSV)
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Exports with columns like{" "}
          <strong>Stock Number</strong>, <strong>Model</strong>, <strong>Year</strong>,{" "}
          <strong>Price</strong>, <strong>Mileage</strong>, and optional{" "}
          <strong>Location</strong> / <strong>Status</strong> are supported.{" "}
          <strong>Stock Number</strong> is the internal <code>sku</code>. Each import{" "}
          <strong>replaces the catalog</strong>: any bike not listed in the file is
          removed (e.g. sold). URL scrapes or manual rows with skus that never appear
          in a later CSV are removed too.{" "}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Media:</strong> use a folder per stock, named exactly like the
          stock number, and drop it (or a parent of several) into the dashed area, or
          use the file picker. File names in flat folders can still use the
          <code>STOCK</code> prefix on the file name.
        </p>
        <form
          onSubmit={onCsvSubmit}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              CSV file
            </label>
            <input
              name="csv"
              type="file"
              accept=".csv,text/csv"
              required
              disabled={pending}
              className="mt-1 block w-full text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Importing…" : "Import / update bikes"}
          </button>
        </form>
        {csvState && (
          <p
            className={
              csvState.ok
                ? "mt-3 text-sm text-emerald-700 dark:text-emerald-400"
                : "mt-3 text-sm text-red-700 dark:text-red-400"
            }
            role="status"
          >
            {csvState.ok
              ? `Saved ${csvState.imported} bike(s) from the file, removed ${csvState.removed} not in the file anymore.`
              : csvState.error}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          2. Upload photos and videos
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Each file name must <strong>start with the stock number</strong>, e.g.{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            U612099-MKE-1.jpg
          </code>
          , <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            U612099_MKE-02.mp4
          </code>
          . You can select many files at once, or a whole folder. Files go to
          Supabase <code className="text-xs">bike-media</code> and are linked to
          the matching bike.
        </p>
        <div className="mt-4">
          <BulkMediaUploader key={mediaKey} />
        </div>
      </section>
    </div>
  );
}
