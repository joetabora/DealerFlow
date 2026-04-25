import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-gray-200/80", className)}
      aria-hidden
    />
  );
}

export function InventoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="mt-2.5 h-4 w-1/2" />
        <div className="mt-2 flex justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-3 w-24" />
      </div>
    </div>
  );
}

export function InventoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <InventoryCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function SchedulerSkeleton() {
  return (
    <div className="grid min-h-[400px] grid-cols-7 gap-2 sm:gap-3">
      {Array.from({ length: 7 }).map((_, d) => (
        <div key={d} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-12" />
          {Array.from({ length: 4 }).map((_, s) => (
            <Skeleton key={s} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { SchedulerSkeleton as SchedulerGridSkeleton };
