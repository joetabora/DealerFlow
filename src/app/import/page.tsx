import Link from "next/link";
import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Import inventory
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Paste listing page URLs. The server fetches HTML, parses fields with{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">cheerio</code>
          , and upserts rows into{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">bikes</code>{" "}
          by SKU. If you get <strong>HTTP 403</strong> (common with Cloudflare),
          use the <a className="underline" href="#paste-html">paste HTML</a>{" "}
          section below. Configure per-domain selectors in{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            src/lib/scrape/registry.ts
          </code>
          .
        </p>
        <p className="mt-3 text-sm">
          <Link
            href="/import/csv"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            CSV and bulk media
          </Link>
          {" · "}
          <Link
            href="/inventory"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            View inventory
          </Link>
        </p>
      </div>
      <ImportForm />
    </main>
  );
}
