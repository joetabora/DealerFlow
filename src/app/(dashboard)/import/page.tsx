import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonSecondary } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="URL import"
        description="Scrape listing HTML with cheerio, upsert by SKU. Use paste-HTML if the server returns 403."
        action={
          <Link
            href="/import/csv"
            className={buttonSecondary + " hidden sm:inline-flex"}
          >
            CSV &amp; media
          </Link>
        }
      />
      <AppLayout>
        <div className="max-w-3xl space-y-4">
          <p className="text-sm text-gray-600">
            Per-domain CSS selectors live in{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
              src/lib/scrape/registry.ts
            </code>
            . After import, open{" "}
            <Link
              href="/inventory"
              className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
            >
              Inventory
            </Link>{" "}
            to review.
          </p>
          <Card>
            <ImportForm />
          </Card>
        </div>
      </AppLayout>
    </>
  );
}
