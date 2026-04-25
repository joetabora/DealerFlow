import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        DealerFlow
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        SKU-driven inventory import from listing URLs (cheerio + Supabase), with
        a minimal inventory UI.
      </p>
      <ul className="mt-8 flex flex-col gap-3 text-sm">
        <li>
          <Link
            href="/import/csv"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            CSV and media
          </Link>
          <span className="text-zinc-500"> — inventory file + photos/videos</span>
        </li>
        <li>
          <Link
            href="/import"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Import URLs
          </Link>
          <span className="text-zinc-500"> — scrape and upsert bikes</span>
        </li>
        <li>
          <Link
            href="/inventory"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Inventory
          </Link>
          <span className="text-zinc-500"> — browse saved bikes</span>
        </li>
      </ul>
      <p className="mt-10 text-xs text-zinc-500">
        Configure{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.env.local</code>{" "}
        and run the SQL in{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          supabase/migrations
        </code>{" "}
        in the Supabase SQL editor.
      </p>
    </main>
  );
}
