import Link from "next/link";
import { InventorySyncClient } from "./InventorySyncClient";

export default function CsvImportPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          CSV and media
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Import your inventory file, then attach photos and videos. Stock numbers
          in filenames must match the <strong>Stock Number</strong> column in the
          CSV.
        </p>
        <p className="mt-3 text-sm">
          <Link
            href="/import"
            className="text-zinc-900 underline dark:text-zinc-100"
          >
            URL / HTML import
          </Link>
          {" · "}
          <Link
            href="/inventory"
            className="text-zinc-900 underline dark:text-zinc-100"
          >
            View inventory
          </Link>
        </p>
      </div>
      <InventorySyncClient />
    </main>
  );
}
