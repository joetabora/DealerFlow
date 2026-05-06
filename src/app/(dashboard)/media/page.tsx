import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonSecondary } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InventorySyncClient } from "@/app/(dashboard)/import/csv/InventorySyncClient";

export default function MediaPage() {
  return (
    <>
      <PageHeader
        title="Media"
        description="Sync inventory, then drop folders or files so filenames match your stock numbers."
        action={
          <Link
            href="/import"
            className={buttonSecondary + " hidden sm:inline-flex"}
          >
            URL import
          </Link>
        }
      />
      <AppLayout>
        <div className="max-w-3xl space-y-4">
          <p className="text-sm text-gray-600">
            Stock numbers in filenames must match the{" "}
            <strong>Stock Number</strong> column in your CSV.{" "}
            <Link
              href="/inventory"
              className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2"
            >
              View inventory
            </Link>{" "}
            after upload.
          </p>
          <Card>
            <InventorySyncClient />
          </Card>
        </div>
      </AppLayout>
    </>
  );
}
