"use client";

import { useState, useTransition } from "react";
import { importInventoryCsv, type CsvImportResult } from "./actions";
import { BulkMediaUploader } from "./BulkMediaUploader";
import { buttonPrimary } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function InventorySyncClient() {
  const { show } = useToast();
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
        show(
          `Inventory updated: ${r.imported} in stock, ${r.removed} removed from catalog.`,
          "success",
        );
      } else {
        show(r.error, "error");
      }
    });
  }

  return (
    <div className="space-y-7">
      <section>
        <h2 className="text-lg font-medium leading-tight text-gray-800">
          1. Import inventory (CSV)
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
          Exports with columns like{" "}
          <strong>Stock Number</strong>, <strong>Model</strong>, <strong>Year</strong>,{" "}
          <strong>Price</strong>, <strong>Mileage</strong>, and optional{" "}
          <strong>Location</strong> / <strong>Status</strong> are supported.{" "}
          <strong>Stock Number</strong> is the internal <code>sku</code>. Each import{" "}
          <strong>replaces the catalog</strong>: any bike not listed in the file is
          removed (e.g. sold). URL scrapes or manual rows with skus that never appear
          in a later CSV are removed too.{" "}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
          <strong>Media:</strong> use a folder per stock, named exactly like the
          stock number, and drop it (or a parent of several) into the dashed area, or
          use the file picker. File names in flat folders can still use the
          <code>STOCK</code> prefix on the file name.
        </p>
        <form
          onSubmit={onCsvSubmit}
          className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
              CSV file
            </label>
            <input
              name="csv"
              type="file"
              accept=".csv,text/csv"
              required
              disabled={pending}
              className="mt-0.5 block w-full text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className={buttonPrimary + " w-full disabled:opacity-50 sm:w-auto"}
          >
            {pending ? "Importing…" : "Import / update bikes"}
          </button>
        </form>
        {csvState && !csvState.ok ? (
          <p className="mt-2.5 text-sm text-red-700" role="status">
            {csvState.error}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-medium leading-tight text-gray-800">
          2. Upload photos and videos
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
          Each file name must <strong>start with the stock number</strong>, e.g.{" "}
          <code className="rounded bg-gray-100 px-1.5 text-xs">U612099-MKE-1.jpg</code>
          , <code className="rounded bg-gray-100 px-1.5 text-xs">U612099_MKE-02.mp4</code>
          . You can select many files at once, or a whole folder. Files go to
          Supabase <code className="text-xs">bike-media</code> and are linked to
          the matching bike.
        </p>
        <div className="mt-3">
          <BulkMediaUploader key={mediaKey} />
        </div>
      </section>
    </div>
  );
}
