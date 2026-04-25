import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { InventoryGridSkeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <>
      <PageHeader title="Inventory" />
      <AppLayout>
        <InventoryGridSkeleton count={8} />
      </AppLayout>
    </>
  );
}
