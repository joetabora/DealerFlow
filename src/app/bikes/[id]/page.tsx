import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Bike, BikeMedia } from "@/types/bike";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function BikeDetailPage({ params }: Props) {
  const { id } = await params;
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Missing Supabase environment variables. Copy{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            .env.local.example
          </code>{" "}
          to <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code>.
        </p>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("bikes")
    .select(
      "id, sku, title, year, model, mileage, price, location, description, status, last_posted_at, post_count, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const bike = data as Bike;

  const { data: mediaRows } = await supabase
    .from("media")
    .select("id, file_url, type")
    .eq("bike_id", id)
    .order("created_at", { ascending: true });
  const media = (mediaRows as BikeMedia[] | null) ?? [];

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <p className="mb-6 text-sm">
        <Link
          href="/inventory"
          className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
        >
          ← Inventory
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {bike.title ?? "Untitled"}
      </h1>
      <p className="mt-1 font-mono text-sm text-zinc-500">SKU {bike.sku}</p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Year
          </dt>
          <dd className="mt-1 text-sm tabular-nums">{bike.year ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Model
          </dt>
          <dd className="mt-1 text-sm">{bike.model ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Price
          </dt>
          <dd className="mt-1 text-sm">{bike.price ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Mileage
          </dt>
          <dd className="mt-1 text-sm tabular-nums">
            {bike.mileage != null ? bike.mileage.toLocaleString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Location
          </dt>
          <dd className="mt-1 text-sm">{bike.location ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
          </dt>
          <dd className="mt-1 text-sm capitalize">{bike.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Post count
          </dt>
          <dd className="mt-1 text-sm tabular-nums">{bike.post_count}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Last posted
          </dt>
          <dd className="mt-1 text-sm">
            {bike.last_posted_at
              ? new Date(bike.last_posted_at).toLocaleString()
              : "Never"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Description
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {bike.description ?? "—"}
          </dd>
        </div>
      </dl>

      {media.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Media
          </h2>
          <ul className="mt-3 grid list-none gap-3 sm:grid-cols-2">
            {media.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.file_url}
                    alt=""
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <video
                    src={m.file_url}
                    controls
                    className="h-48 w-full object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
