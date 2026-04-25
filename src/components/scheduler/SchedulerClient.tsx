"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { mapPostsToGrid } from "@/lib/schedule-mapper";
import {
  buildApplyFlat,
  buildGenerateApplyFlat,
  hasDuplicateBikesOnSameDay,
  weekRange,
} from "@/lib/schedule-apply";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { buttonPrimary, buttonSecondary } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SchedulerGridSkeleton } from "@/components/ui/skeleton";
import { SchedulerCard } from "@/components/scheduler/SchedulerCard";
import { cn } from "@/lib/cn";
import {
  applyWeek,
  clearWeek,
  getSchedulerPosts,
  listBikesForSchedule,
} from "@/app/scheduler/actions";
import { getMonday, dayLabels } from "@/lib/week";
import type { LocationFilter, StatusFilter, SchedulerCell } from "@/types/scheduler";

function toDropSlot(over: { id: string | number } | null) {
  if (!over) return null;
  const s = String(over.id);
  const a = /^drop-(\d+)-(\d+)$/.exec(s);
  if (a) return { d: +a[1]!, s: +a[2]! };
  const b = /^drag-(\d+)-(\d+)$/.exec(s);
  if (b) return { d: +b[1]!, s: +b[2]! };
  return null;
}

function fromActive(active: { id: string | number } | null) {
  if (!active) return null;
  const s = String(active.id);
  const b = /^drag-(\d+)-(\d+)$/.exec(s);
  if (b) return { d: +b[1]!, s: +b[2]! };
  return null;
}

function filterVisible(
  c: SchedulerCell,
  loc: LocationFilter,
  st: StatusFilter,
): boolean {
  if (st !== "all" && c.status !== st) return false;
  if (loc === "all") return true;
  const l = (c.location ?? "").toLowerCase();
  if (loc === "milwaukee") return l.includes("milwaukee");
  if (loc === "west-bend") return l.includes("west") && l.includes("bend");
  return true;
}

function dayLabel(monday: Date, dayIndex: number) {
  const t = new Date(monday);
  t.setDate(t.getDate() + dayIndex);
  return t.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function EmptySlot({ d, s, overRing }: { d: number; s: number; overRing: boolean }) {
  const id = `drop-${d}-${s}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[5rem] items-center justify-center rounded-xl border border-dashed p-0.5 text-xs text-gray-400 transition",
        isOver && overRing
          ? "border-gray-900/20 bg-gray-50 ring-1 ring-inset ring-gray-900/15"
          : "border-gray-200/80 bg-gray-50/40",
      )}
    >
      Drop here
    </div>
  );
}

type FilledProps = {
  d: number;
  s: number;
  cell: SchedulerCell;
  overRing: boolean;
  locFilter: LocationFilter;
  stFilter: StatusFilter;
};

function FilledSlot({ d, s, cell, overRing, locFilter, stFilter }: FilledProps) {
  const dropId = `drop-${d}-${s}`;
  const dragId = `drag-${d}-${s}`;
  const { setNodeRef: setDrop, isOver: overDrop } = useDroppable({ id: dropId });
  const {
    setNodeRef: setDrag,
    attributes,
    listeners,
    transform,
    isDragging,
  } = useDraggable({ id: dragId, data: { d, s, cell } });
  const dimmed = !filterVisible(cell, locFilter, stFilter);
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div
      ref={setDrop}
      className={cn(
        "rounded-xl p-0.5 transition",
        overDrop && overRing
          ? "bg-gray-50 ring-1 ring-inset ring-gray-900/15"
          : "border border-transparent",
      )}
    >
      <div
        ref={setDrag}
        style={style}
        {...attributes}
        {...listeners}
        className="touch-none"
      >
        <SchedulerCard
          cell={cell}
          dimmed={dimmed}
          className="cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
}

function SlotCell(props: {
  d: number;
  s: number;
  cell: SchedulerCell | null;
  overRing: boolean;
  locFilter: LocationFilter;
  stFilter: StatusFilter;
}) {
  if (props.cell) {
    return (
      <FilledSlot
        d={props.d}
        s={props.s}
        cell={props.cell}
        overRing={props.overRing}
        locFilter={props.locFilter}
        stFilter={props.stFilter}
      />
    );
  }
  return <EmptySlot d={props.d} s={props.s} overRing={props.overRing} />;
}

const empty7x4 = () =>
  Array.from({ length: 7 }, () => [null, null, null, null] as (SchedulerCell | null)[]);

export default function SchedulerClient() {
  const { show } = useToast();
  const [monday] = useState(() => getMonday(new Date()));
  const [grid, setGrid] = useState<(SchedulerCell | null)[][]>(empty7x4);
  const [locFilter, setLocFilter] = useState<LocationFilter>("all");
  const [stFilter, setStFilter] = useState<StatusFilter>("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<SchedulerCell | null>(null);
  const [overRing, setOverRing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isBoot, setIsBoot] = useState(true);

  const { from, to } = useMemo(() => weekRange(monday), [monday]);
  const hasAny = useMemo(
    () => grid.length > 0 && grid.some((r) => r.some((c) => c != null)),
    [grid],
  );

  const reload = useCallback(async () => {
    setLoadError(null);
    const r = await getSchedulerPosts(from, to);
    if (!r.ok) {
      setLoadError(r.error);
      return;
    }
    const posts = r.posts.map((p) => ({
      id: p.id,
      bike_id: p.bike_id,
      scheduled_date: p.scheduled_date,
      status: p.status,
      title: p.title,
      price: p.price,
      location: p.location,
      thumb: p.thumb,
    }));
    setGrid(mapPostsToGrid(monday, posts));
  }, [from, to, monday]);

  useEffect(() => {
    setIsBoot(true);
    const run = async () => {
      setLoadError(null);
      const r = await getSchedulerPosts(from, to);
      if (!r.ok) {
        setLoadError(r.error);
        setIsBoot(false);
        return;
      }
      const posts = r.posts.map((p) => ({
        id: p.id,
        bike_id: p.bike_id,
        scheduled_date: p.scheduled_date,
        status: p.status,
        title: p.title,
        price: p.price,
        location: p.location,
        thumb: p.thumb,
      }));
      setGrid(mapPostsToGrid(monday, posts));
      setIsBoot(false);
    };
    void run();
  }, [from, to, monday]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const persist = useCallback(
    (next: (SchedulerCell | null)[][]) => {
      if (hasDuplicateBikesOnSameDay(next)) {
        show("Two posts for the same bike on one day is not allowed.", "error");
        return;
      }
      startTransition(async () => {
        const r = await applyWeek(from, to, buildApplyFlat(monday, next));
        if (r.ok) {
          show("Schedule updated.", "success");
          await reload();
        } else {
          show(r.error, "error");
          await reload();
        }
      });
    },
    [from, to, monday, show, reload],
  );

  const onDragStart = (e: DragStartEvent) => {
    setOverRing(true);
    const d = e.active.data.current as { cell?: SchedulerCell } | undefined;
    setActiveCell(d?.cell ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setOverRing(false);
    setActiveCell(null);
    const from = fromActive(e.active);
    const t = toDropSlot(e.over);
    if (from == null || t == null) return;
    if (from.d === t.d && from.s === t.s) return;

    setGrid((g) => {
      const n = g.map((row) => row.map((c) => c));
      if (!n[from.d]?.[from.s] || n[from.d]![from.s] == null) return g;
      const a = n[from.d]![from.s]!;
      const b = n[t.d]![t.s];
      n[t.d]![t.s] = a;
      n[from.d]![from.s] = b;
      if (hasDuplicateBikesOnSameDay(n)) {
        show("That move would duplicate a bike on the same day.", "error");
        return g;
      }
      queueMicrotask(() => persist(n));
      return n;
    });
  };

  const onGenerate = useCallback(() => {
    startTransition(async () => {
      const b = await listBikesForSchedule(locFilter);
      if (!b.ok) {
        show(b.error, "error");
        return;
      }
      if (b.bikes.length === 0) {
        show("No available bikes for this location filter.", "error");
        return;
      }
      const flat = buildGenerateApplyFlat(monday, b.bikes);
      const r = await applyWeek(from, to, flat);
      if (r.ok) {
        show("Week generated. Drag to adjust or reorder.", "success");
        await reload();
      } else {
        show(r.error, "error");
        await reload();
      }
    });
  }, [from, to, monday, locFilter, show, reload]);

  const onClear = useCallback(() => {
    startTransition(async () => {
      const r = await clearWeek(from, to);
      if (r.ok) {
        show("Week cleared.", "success");
        setGrid(empty7x4());
        await reload();
      } else {
        show(r.error, "error");
      }
    });
  }, [from, to, show, reload]);

  if (isBoot) {
    return (
      <>
        <PageHeader
          title="Scheduler"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="h-9 w-24 animate-pulse rounded-xl bg-gray-200" />
              <span className="h-9 w-20 animate-pulse rounded-xl bg-gray-200" />
            </div>
          }
        />
        <AppLayout>
          <SchedulerGridSkeleton />
        </AppLayout>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Scheduler"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onGenerate}
              className={buttonPrimary}
              disabled={isPending}
            >
              {isPending ? "…" : "Generate week"}
            </button>
            <button
              type="button"
              onClick={onClear}
              className={buttonSecondary}
              disabled={isPending}
            >
              Clear week
            </button>
          </div>
        }
      />
      <AppLayout>
        <div className="space-y-4">
          {loadError && !hasAny ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              {loadError} Connect <code className="rounded bg-amber-100/80 px-1">.env.local</code> to load
              and save.
            </p>
          ) : null}

          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Location
                  </span>
                  <select
                    className="mt-0.5 block rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
                    value={locFilter}
                    onChange={(e) => setLocFilter(e.target.value as LocationFilter)}
                    disabled={isPending}
                  >
                    <option value="all">All</option>
                    <option value="milwaukee">Milwaukee</option>
                    <option value="west-bend">West Bend</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </span>
                  <select
                    className="mt-0.5 block rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
                    value={stFilter}
                    onChange={(e) => setStFilter(e.target.value as StatusFilter)}
                    disabled={isPending}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="posted">Posted</option>
                  </select>
                </div>
              </div>
            </div>

            {!hasAny ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white/80 p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">No posts scheduled for this week.</p>
                <button type="button" onClick={onGenerate} className={buttonPrimary} disabled={isPending}>
                  {isPending ? "Working…" : "Generate week"}
                </button>
              </div>
            ) : (
              <div className="animate-fade-in-up overflow-x-auto pb-1">
                <div className="min-w-[720px] grid grid-cols-7 gap-2 sm:min-w-0 sm:gap-3">
                  {dayLabels.map((day, d) => (
                    <div key={day} className="space-y-2">
                      <div className="px-0.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {day}
                        </p>
                        <p className="text-xs text-gray-500">{dayLabel(monday, d)}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {[0, 1, 2, 3].map((s) => (
                          <div
                            key={s}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${(d * 4 + s) * 30}ms` }}
                          >
                            <SlotCell
                              d={d}
                              s={s}
                              cell={grid[d]?.[s] ?? null}
                              overRing={overRing}
                              locFilter={locFilter}
                              stFilter={stFilter}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DragOverlay dropAnimation={null} className="z-50 w-[min(100vw-2rem,20rem)]">
              {activeCell ? (
                <div className="scale-[1.03] shadow-lg">
                  <SchedulerCard cell={activeCell} className="cursor-grabbing" />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </AppLayout>
    </>
  );
}
