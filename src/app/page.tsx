import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonPrimary, buttonSecondary } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardData } from "@/lib/dashboard-data";

function postStatusVariant(
  s: string,
): "available" | "scheduled" | "default" {
  if (s === "scheduled") return "scheduled";
  if (s === "posted") return "available";
  return "default";
}

function formatPostStatus(s: string) {
  if (s === "draft") return "Draft";
  if (s === "scheduled") return "Scheduled";
  if (s === "posted") return "Posted";
  return s;
}

export default async function Home() {
  const data = await getDashboardData();

  return (
    <>
      <PageHeader title="Dashboard" />
      <AppLayout>
        {data.error === "config" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-900">
            Connect Supabase: set{" "}
            <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and a public key in{" "}
            <code className="rounded bg-amber-100/80 px-1">.env.local</code>.
          </p>
        ) : data.error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-relaxed text-red-800">
            {data.error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total inventory
            </p>
            <p className="mt-0.5 text-2xl font-semibold text-gray-900">
              {data.totalInventory}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">All units in the system</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Available bikes
            </p>
            <p className="mt-0.5 text-2xl font-semibold text-gray-900">
              {data.availableBikes}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">In stock &amp; on the list</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Scheduled today
            </p>
            <p className="mt-0.5 text-2xl font-semibold text-gray-900">
              {data.scheduledToday}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Draft + scheduled (today)</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Missing media
            </p>
            <p className="mt-0.5 text-2xl font-semibold text-gray-900">
              {data.missingMedia}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Available, no photos/video</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle>Quick actions</CardTitle>
            <p className="mt-0.5 text-sm text-gray-600">
              Run imports and get ready to post.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/import/csv"
                className={buttonPrimary + " w-full text-center sm:w-auto"}
              >
                Import CSV
              </Link>
              <Link
                href="/media"
                className={buttonSecondary + " w-full text-center sm:w-auto"}
              >
                Upload media
              </Link>
              <Link
                href="/scheduler"
                className={buttonSecondary + " w-full text-center sm:w-auto"}
              >
                Generate week
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              <Link
                href="/import"
                className="font-medium text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
              >
                Scrape from URL
              </Link>{" "}
              when you can&apos;t export a file.
            </p>
          </Card>

          <Card>
            <CardTitle>Recently scheduled</CardTitle>
            <p className="mt-0.5 text-sm text-gray-600">
              Last five entries on the calendar.
            </p>
            {data.recentPosts.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No posts yet. Open{" "}
                <Link
                  href="/scheduler"
                  className="font-medium text-gray-800 underline underline-offset-2"
                >
                  Scheduler
                </Link>{" "}
                to build your week.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {data.recentPosts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-2 py-2.5 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight text-gray-900 line-clamp-1">
                        {p.bikeTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {new Date(p.scheduledDate).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={postStatusVariant(p.status)}
                      className="shrink-0"
                    >
                      {formatPostStatus(p.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </AppLayout>
    </>
  );
}
