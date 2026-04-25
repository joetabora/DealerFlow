import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonPrimary, buttonSecondary } from "@/components/ui/button";
import { StaggeredInventoryGrid } from "@/components/inventory/staggered-inventory-grid";
import { getInventoryBikes } from "@/lib/inventory-list";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const result = await getInventoryBikes();

  return (
    <>
      <PageHeader
        title="Inventory"
        description="In-stock units from your last CSV sync. Add media and schedule posts from each bike page."
        action={
          <>
            <Link
              href="/import/csv"
              className={buttonPrimary + " inline-flex text-center"}
            >
              Import CSV
            </Link>
            <Link
              href="/import"
              className={buttonSecondary + " hidden text-center sm:inline-flex"}
            >
              URL import
            </Link>
          </>
        }
      />
      <AppLayout>
        {result.ok === false && result.error === "config" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-900">
            Could not load bikes. Set{" "}
            <code className="rounded bg-amber-100 px-1.5">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and a public key in{" "}
            <code className="rounded bg-amber-100 px-1.5">.env.local</code> and apply
            SQL from{" "}
            <code className="rounded bg-amber-100 px-1.5">supabase/migrations</code>.
          </p>
        ) : result.ok === false ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm leading-relaxed text-red-800">
            {result.message ?? "Failed to load inventory."}
          </p>
        ) : result.bikes.length === 0 ? (
          <p className="text-sm text-gray-600">
            No in-stock bikes yet.{" "}
            <Link
              href="/import/csv"
              className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
            >
              Import a CSV
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <StaggeredInventoryGrid bikes={result.bikes} />
        )}
      </AppLayout>
    </>
  );
}
