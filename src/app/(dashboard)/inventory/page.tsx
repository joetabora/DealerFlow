import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonPrimary, buttonSecondary } from "@/components/ui/button";
import { StaggeredInventoryGrid } from "@/components/inventory/staggered-inventory-grid";
import { RestoreSoldBikesBanner } from "@/components/inventory/restore-sold-bikes-banner";
import {
  getBikeStatusCounts,
  getInventoryBikes,
  parseInventoryFilter,
  type InventoryStatusFilter,
} from "@/lib/inventory-list";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ filter?: string }> };

const tabs: { id: InventoryStatusFilter; label: string; href: string }[] = [
  { id: "available", label: "In stock", href: "/inventory" },
  { id: "sold", label: "Sold", href: "/inventory?filter=sold" },
  { id: "all", label: "All", href: "/inventory?filter=all" },
];

export default async function InventoryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = parseInventoryFilter(sp?.filter);

  const [result, counts] = await Promise.all([
    getInventoryBikes(filter),
    getBikeStatusCounts(),
  ]);

  const soldCount = counts.ok ? counts.sold : null;
  const availableCount = counts.ok ? counts.available : null;

  const soldHidden =
    filter === "available" &&
    result.ok &&
    result.bikes.length === 0 &&
    counts.ok &&
    counts.sold > 0;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="CSV can mark absent SKUs as sold. Bulk-restore puts them back in stock; remove listings you truly don\u2019t need with Remove from DealerFlow on each card."
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
        {counts.ok ? (
          <p className="mb-4 text-xs text-gray-500 sm:text-sm">
            In Supabase:&nbsp;
            <span className="font-semibold tabular-nums text-gray-800">
              {availableCount ?? "—"}
            </span>
            {" in stock · "}
            <span className="font-semibold tabular-nums text-gray-800">
              {soldCount ?? "—"}
            </span>
            {" sold"}
          </p>
        ) : null}

        {soldCount !== null && soldCount > 0 ? (
          <RestoreSoldBikesBanner soldCount={soldCount} />
        ) : null}

        <div className="mb-4 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-sm font-medium transition",
                filter === t.id
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

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
        ) : soldHidden ? (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            <p className="font-medium leading-snug text-amber-950">
              No bikes are listed as in stock — but DealerFlow still has{" "}
              <strong>{soldCount ?? 0} sold</strong> record(s).
            </p>
            <p>
              Usually the last CSV didn&apos;t list every SKU, so DealerFlow marked the rest sold.
              Use <strong>Bulk restore</strong> above for a one-click undo, browse the Sold tab,
              or re-import your full dealer file.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/inventory?filter=sold"
                className={buttonPrimary + " inline-flex justify-center"}
              >
                View sold{soldCount != null ? ` (${soldCount})` : ""}
              </Link>
              <Link
                href="/import/csv"
                className={buttonSecondary + " inline-flex justify-center"}
              >
                Re-import CSV
              </Link>
            </div>
            <p className="text-xs text-amber-900/90">
              After restoring, tap <strong>Remove from DealerFlow…</strong> on each listing you truly
              want gone.
            </p>
          </div>
        ) : result.bikes.length === 0 ? (
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            {filter === "sold" ? (
              <>
                <p>No sold bikes in the catalog.</p>
                <Link
                  href="/inventory"
                  className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
                >
                  Back to in stock
                </Link>
              </>
            ) : filter === "all" ? (
              <>
                <p>No bikes in the database yet.</p>
                <Link
                  href="/import/csv"
                  className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
                >
                  Import a CSV
                </Link>
                {" "}
                to get started.
              </>
            ) : (
              <>
                <p>No in-stock bikes listed for this tab.</p>
                <Link
                  href="/import/csv"
                  className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
                >
                  Import a CSV
                </Link>
                {" "}
                if you&apos;re starting fresh — or check Sold / All tabs if you synced
                recently.
              </>
            )}
          </div>
        ) : (
          <StaggeredInventoryGrid bikes={result.bikes} />
        )}
      </AppLayout>
    </>
  );
}
