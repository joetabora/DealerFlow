import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonSecondary } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SchedulerPage() {
  return (
    <>
      <PageHeader
        title="Scheduler"
        description="Plan the week: pick units, pick platforms, and keep a steady cadence on social."
        action={
          <Link
            href="/inventory"
            className={buttonSecondary + " hidden sm:inline-flex"}
          >
            View inventory
          </Link>
        }
      />
      <AppLayout>
        <Card>
          <h2 className="text-lg font-medium text-gray-800">
            Coming soon
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            The posting calendar and batch generator will live here. Your{" "}
            <strong>Recently scheduled</strong> list on the dashboard will show
            the latest <code className="rounded bg-gray-100 px-1">posts</code> rows
            as you start using the API.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            For now, track dates manually or wire up inserts to{" "}
            <code className="rounded bg-gray-100 px-1.5 text-xs">public.posts</code>{" "}
            in Supabase.
          </p>
        </Card>
      </AppLayout>
    </>
  );
}
