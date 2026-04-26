import Link from "next/link";
import { notFound } from "next/navigation";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonSecondary } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Bike, BikeMedia } from "@/types/bike";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const label = "text-xs font-medium uppercase tracking-wide text-gray-500";
const value = "mt-0.5 text-sm text-gray-900";

export default async function BikeDetailPage({ params }: Props) {
  const { id } = await params;
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <>
        <PageHeader title="Bike" />
        <AppLayout>
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-900">
            Missing Supabase environment. Copy{" "}
            <code className="rounded bg-amber-100/80 px-1">.env.local.example</code>{" "}
            to <code className="rounded bg-amber-100/80 px-1">.env.local</code>.
          </p>
        </AppLayout>
      </>
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
    .select("id, file_url, type, status, original_url, compressed_url, processing_error")
    .eq("bike_id", id)
    .order("created_at", { ascending: true });
  const media = (mediaRows as BikeMedia[] | null) ?? [];

  return (
    <>
      <PageHeader
        title={bike.title ?? "Untitled bike"}
        description={`SKU ${bike.sku}`}
        action={
          <Link
            href="/inventory"
            className={buttonSecondary + " inline-flex"}
          >
            Back to inventory
          </Link>
        }
      />
      <AppLayout>
        <div className="mx-auto max-w-3xl space-y-5">
          <Card>
            <h2 className="text-lg font-medium leading-tight text-gray-800">
              Details
            </h2>
            <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className={label}>Year</dt>
                <dd className={value}>{bike.year ?? "—"}</dd>
              </div>
              <div>
                <dt className={label}>Model</dt>
                <dd className={value}>{bike.model ?? "—"}</dd>
              </div>
              <div>
                <dt className={label}>Price</dt>
                <dd className={value}>{bike.price ?? "—"}</dd>
              </div>
              <div>
                <dt className={label}>Mileage</dt>
                <dd className={`${value} tabular-nums`}>
                  {bike.mileage != null ? bike.mileage.toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className={label}>Location</dt>
                <dd className={value}>{bike.location ?? "—"}</dd>
              </div>
              <div>
                <dt className={label}>Status</dt>
                <dd className="mt-0.5">
                  <Badge
                    variant={bike.status === "available" ? "available" : "sold"}
                  >
                    {bike.status === "available" ? "Available" : "Sold"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className={label}>Posts</dt>
                <dd className={`${value} tabular-nums`}>{bike.post_count}</dd>
              </div>
              <div>
                <dt className={label}>Last posted</dt>
                <dd className={value}>
                  {bike.last_posted_at
                    ? new Date(bike.last_posted_at).toLocaleString()
                    : "Never"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={label}>Description</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {bike.description ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>

          {media.length > 0 ? (
            <div>
              <h2 className="text-lg font-medium leading-tight text-gray-800">
                Media
              </h2>
              <ul className="mt-3 grid list-none gap-3 sm:grid-cols-2">
                {media.map((m) => {
                  const v = m.type === "video" ? m.status : undefined;
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
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                          {m.type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
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
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </AppLayout>
    </>
  );
}
