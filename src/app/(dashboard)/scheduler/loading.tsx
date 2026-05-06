import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { SchedulerGridSkeleton } from "@/components/ui/skeleton";

export default function SchedulerLoading() {
  return (
    <>
      <PageHeader title="Scheduler" />
      <AppLayout>
        <SchedulerGridSkeleton />
      </AppLayout>
    </>
  );
}
