import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonSecondary } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InventorySyncClient } from "./InventorySyncClient";

export default function CsvImportPage() {
  return (
    <>
      <PageHeader
        title="Import CSV & media"
        description="The same flow as Media—replace a catalog, then attach files named with stock numbers."
        action={
          <Link
            href="/media"
            className={buttonSecondary + " hidden sm:inline-flex"}
          >
            Media hub
          </Link>
        }
      />
      <AppLayout>
        <div className="max-w-3xl space-y-4">
          <p className="text-sm leading-relaxed text-gray-600">
            <Link
              href="/import"
              className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
            >
              URL / HTML import
            </Link>{" "}
            ·{" "}
            <Link
              href="/inventory"
              className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
            >
              View inventory
            </Link>
          </p>
          <Card>
            <InventorySyncClient />
          </Card>
        </div>
      </AppLayout>
    </>
  );
}
