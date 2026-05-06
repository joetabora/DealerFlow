import { Suspense } from "react";
import SchedulerClient from "@/components/scheduler/SchedulerClient";
import { SchedulerGridSkeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";

export default function SchedulerPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Scheduler" />
          <AppLayout>
            <SchedulerGridSkeleton />
          </AppLayout>
        </>
      }
    >
      <SchedulerClient />
    </Suspense>
  );
}
