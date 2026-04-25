import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Bike } from "@/types/bike";

export const dynamic = "force-dynamic";

async function loadBikes(): Promise<Bike[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bikes")
      .select(
        "id, sku, title, year, model, mileage, price, location, description, status, last_posted_at, post_count, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as Bike[]) ?? [];
  } catch {
    return null;
  }
}

export default async function InventoryPage() {
  const bikes = await loadBikes();

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            SKU-driven bikes from Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/import/csv"
            className="inline-flex w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            CSV &amp; media
          </Link>
          <Link
            href="/import"
            className="inline-flex w-fit rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
          >
            URL import
          </Link>
        </div>
      </div>

      {bikes === null ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Could not load bikes. Set{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and a public key ({" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          or{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          </code>
          ){" "}
          in{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            .env.local
          </code>{" "}
          and apply the SQL migration in{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            supabase/migrations
          </code>
          .
        </p>
      ) : bikes.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No bikes yet.{" "}
          <Link
            href="/import/csv"
            className="font-medium underline underline-offset-2"
          >
            Import CSV
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Mileage</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Last posted</th>
                <th className="px-3 py-2 font-medium">Posts</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {bikes.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-3 py-2 font-mono text-xs">{b.sku}</td>
                  <td className="max-w-[200px] truncate px-3 py-2">
                    {b.title ?? "—"}
                  </td>
                  <td className="px-3 py-2">{b.price ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {b.mileage != null ? b.mileage.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">{b.location ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">{b.status}</td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {b.last_posted_at
                      ? new Date(b.last_posted_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{b.post_count}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/bikes/${b.id}`}
                      className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
