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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { mapPostsToGrid } from "@/lib/schedule-mapper";
import {
  buildApplyFlat,
  buildGenerateApplyFlat,
  buildGenerateDayApplyFlat,
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
  getSchedulerPayloadForBike,
  getSchedulerPosts,
  getSlotPlan,
  listBikesForSchedule,
} from "@/app/scheduler/actions";
import { SHELL_MAX, SHELL_PX } from "@/components/app/shell-classnames";
import { defaultHoursByDay } from "@/lib/post-timing";
import { getMonday, getSlotDate, dayLabels } from "@/lib/week";
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

function fromActiveDrag(active: { id: string | number } | null) {
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

function formatSlotTime(
  monday: Date,
  d: number,
  s: number,
  hoursByDay: number[][],
) {
  const dayH = hoursByDay[d] ?? hoursByDay[0] ?? defaultHoursByDay()[0]!;
  const inst = getSlotDate(monday, d, s, dayH);
  return inst.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function EmptySlot({
  d,
  s,
  overRing,
  timeHint,
}: {
  d: number;
  s: number;
  overRing: boolean;
  timeHint: string;
}) {
  const id = `drop-${d}-${s}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed p-1.5 text-center transition",
        "max-md:min-h-[5.5rem] max-md:py-2",
        isOver && overRing
          ? "border-gray-900/20 bg-gray-50 ring-1 ring-inset ring-gray-900/10"
          : isOver
            ? "border-gray-900/15 bg-gray-50/60"
            : "border-gray-200/80 bg-gray-50/50",
      )}
    >
      <span className="text-[10px] font-medium text-gray-400">{timeHint}</span>
      <span className="text-xs text-gray-400">Open slot · drop a card</span>
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
  timeLabel: string;
  onCaptionUpdate: (d: number, s: number, text: string) => void;
  onCaptionCommit: () => void;
};

function FilledSlot({
  d,
  s,
  cell,
  overRing,
  locFilter,
  stFilter,
  timeLabel,
  onCaptionUpdate,
  onCaptionCommit,
}: FilledProps) {
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
        "rounded-xl p-0.5 transition duration-200",
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
          timeLabel={timeLabel}
          className="cursor-grab active:scale-[0.99] active:cursor-grabbing"
          onCaptionChange={(t) => onCaptionUpdate(d, s, t)}
          onCaptionCommit={onCaptionCommit}
        />
      </div>
    </div>
  );
}

type SlotCellProps = {
  d: number;
  s: number;
  cell: SchedulerCell | null;
  overRing: boolean;
  locFilter: LocationFilter;
  stFilter: StatusFilter;
  monday: Date;
  hoursByDay: number[][];
  onCaptionUpdate: (d: number, s: number, text: string) => void;
  onCaptionCommit: () => void;
};

function SlotCell(props: SlotCellProps) {
  const { d, s, overRing, locFilter, stFilter, monday, hoursByDay, onCaptionUpdate, onCaptionCommit } =
    props;
  const timeHint = formatSlotTime(monday, d, s, hoursByDay);
  if (props.cell) {
    return (
      <FilledSlot
        d={d}
        s={s}
        cell={props.cell}
        overRing={overRing}
        locFilter={locFilter}
        stFilter={stFilter}
        timeLabel={timeHint}
        onCaptionUpdate={onCaptionUpdate}
        onCaptionCommit={onCaptionCommit}
      />
    );
  }
  return <EmptySlot d={d} s={s} overRing={overRing} timeHint={timeHint} />;
}

const empty7x4 = () =>
  Array.from({ length: 7 }, () => [null, null, null, null] as (SchedulerCell | null)[]);

export default function SchedulerClient() {
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [monday] = useState(() => getMonday(new Date()));
  const [grid, setGrid] = useState<(SchedulerCell | null)[][]>(empty7x4);
  const gridRef = useRef(grid);
  useLayoutEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  const [hoursByDay, setHoursByDay] = useState<number[][]>(() => defaultHoursByDay());
  const [locFilter, setLocFilter] = useState<LocationFilter>("all");
  const [stFilter, setStFilter] = useState<StatusFilter>("all");
  const [dayToGen, setDayToGen] = useState(0);
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
    const [r, plan] = await Promise.all([getSchedulerPosts(from, to), getSlotPlan()]);
    if (plan.ok) setHoursByDay(plan.hoursByDay);
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
      caption: p.caption,
    }));
    setGrid(mapPostsToGrid(monday, posts));
  }, [from, to, monday]);

  useEffect(() => {
    setIsBoot(true);
    const run = async () => {
      setLoadError(null);
      const [r, plan] = await Promise.all([getSchedulerPosts(from, to), getSlotPlan()]);
      if (plan.ok) setHoursByDay(plan.hoursByDay);
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
        caption: p.caption,
      }));
      setGrid(mapPostsToGrid(monday, posts));
      setIsBoot(false);
    };
    void run();
  }, [from, to, monday]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

  const persist = useCallback(
    (next: (SchedulerCell | null)[][]) => {
      if (hasDuplicateBikesOnSameDay(next)) {
        show("Two posts for the same bike on one day is not allowed.", "error");
        return;
      }
      startTransition(async () => {
        const r = await applyWeek(from, to, buildApplyFlat(monday, next, hoursByDay));
        if (r.ok) {
          show("Schedule updated.", "success");
          await reload();
        } else {
          show(r.error, "error");
          await reload();
        }
      });
    },
    [from, to, monday, hoursByDay, show, reload],
  );

  const onCaptionUpdate = useCallback(
    (d: number, s: number, text: string) => {
      setGrid((g) => {
        const n = g.map((row) => row.map((c) => c));
        const cur = n[d]![s];
        if (cur) n[d]![s] = { ...cur, caption: text };
        return n;
      });
    },
    [],
  );

  const onCaptionCommit = useCallback(() => {
    persist(gridRef.current);
  }, [persist]);

  const onDragStart = (e: DragStartEvent) => {
    setOverRing(true);
    const d = e.active.data.current as { cell?: SchedulerCell } | undefined;
    setActiveCell(d?.cell ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setOverRing(false);
    setActiveCell(null);
    const fromSlot = fromActiveDrag(e.active);
    const t = toDropSlot(e.over);
    if (fromSlot == null || t == null) return;
    if (fromSlot.d === t.d && fromSlot.s === t.s) return;

    setGrid((g) => {
      const n = g.map((row) => row.map((c) => c));
      if (!n[fromSlot.d]?.[fromSlot.s] || n[fromSlot.d]![fromSlot.s] == null) {
        return g;
      }
      const a = n[fromSlot.d]![fromSlot.s]!;
      const b = n[t.d]![t.s];
      n[t.d]![t.s] = a;
      n[fromSlot.d]![fromSlot.s] = b;
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
      const [b, plan] = await Promise.all([
        listBikesForSchedule(from, to, locFilter, { type: "replaceEntireWorkWeek" }),
        getSlotPlan(),
      ]);
      const h = plan.ok ? plan.hoursByDay : defaultHoursByDay();
      if (plan.ok) setHoursByDay(plan.hoursByDay);
      if (!b.ok) {
        show(b.error, "error");
        return;
      }
      if (b.bikes.length === 0) {
        show("No in-stock units with media for this location filter. Upload photos first.", "error");
        return;
      }
      const flat = buildGenerateApplyFlat(
        monday,
        b.bikes,
        h,
        b.anchorPosts,
        locFilter,
      );
      const r = await applyWeek(from, to, flat);
      if (r.ok) {
        show("Week generated (14-day rule, media, balance). Edit captions and drag to adjust.", "success");
        await reload();
      } else {
        show(r.error, "error");
        await reload();
      }
    });
  }, [from, to, monday, locFilter, show, reload]);

  const onGenerateDay = useCallback(() => {
    startTransition(async () => {
      const [b, plan] = await Promise.all([
        listBikesForSchedule(from, to, locFilter, {
          type: "replaceDayInWeek",
          dayIndex: dayToGen,
        }),
        getSlotPlan(),
      ]);
      const h = plan.ok ? plan.hoursByDay : defaultHoursByDay();
      if (plan.ok) setHoursByDay(plan.hoursByDay);
      if (!b.ok) {
        show(b.error, "error");
        return;
      }
      if (b.bikes.length === 0) {
        show("No in-stock units with media for this filter. Upload photos first.", "error");
        return;
      }
      const g = gridRef.current;
      const flat = buildGenerateDayApplyFlat(
        monday,
        dayToGen,
        b.bikes,
        h,
        b.anchorPosts,
        locFilter,
        g,
      );
      const r = await applyWeek(from, to, flat);
      if (r.ok) {
        show("Day generated. Open captions below each card to edit.", "success");
        await reload();
      } else {
        show(r.error, "error");
        await reload();
      }
    });
  }, [from, to, monday, locFilter, dayToGen, show, reload]);

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

  useEffect(() => {
    if (isBoot) return;
    const id = searchParams.get("addBike");
    if (!id?.trim()) return;
    let gone = false;
    (async () => {
      const r = await getSchedulerPayloadForBike(id.trim());
      if (gone) return;
      if (!r.ok) {
        show(r.error, "error");
        router.replace("/scheduler", { scroll: false });
        return;
      }
      const cell = r.cell;
      setGrid((g) => {
        const n = g.map((row) => row.map((c) => c));
        for (let d = 0; d < 7; d++) {
          for (let s = 0; s < 4; s++) {
            if (n[d]![s] == null) {
              n[d]![s] = cell;
              const nd = d;
              queueMicrotask(() => {
                persist(n);
                router.replace("/scheduler", { scroll: false });
                show(
                  "Added to the first open slot. Edit the caption or drag the card to move it.",
                  "success",
                );
                document
                  .getElementById(`scheduler-day-${nd}`)
                  ?.scrollIntoView({ behavior: "smooth" });
              });
              return n;
            }
          }
        }
        show("This week is full. Clear a slot or clear the week first.", "error");
        router.replace("/scheduler", { scroll: false });
        return g;
      });
    })();
    return () => {
      gone = true;
    };
  }, [isBoot, searchParams, show, router, persist]);

  if (isBoot) {
    return (
      <>
        <PageHeader
          title="Scheduler"
          action={
            <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
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
            <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
            <div className="flex flex-wrap items-end gap-1.5">
              <div>
                <span className="mb-0.5 block text-[10px] font-medium text-gray-500">
                  Day
                </span>
                <select
                  className="h-9 min-w-[4.5rem] rounded-lg border border-gray-300 bg-white px-2 text-sm"
                  value={dayToGen}
                  onChange={(e) => setDayToGen(+e.target.value)}
                  disabled={isPending}
                >
                  {dayLabels.map((L, i) => (
                    <option key={L} value={i}>
                      {L}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={onGenerateDay}
                className={buttonPrimary}
                disabled={isPending}
              >
                {isPending ? "…" : "Generate day"}
              </button>
            </div>
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
      <AppLayout className="max-md:pb-24">
        <div className="space-y-4 transition-opacity duration-200">
          {loadError && !hasAny ? (
            <p className="animate-enter rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              {loadError} Connect <code className="rounded bg-amber-100/80 px-1">.env.local</code> to
              load and save.
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
                    className="mt-0.5 min-h-11 w-full min-w-[8rem] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
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
                    className="mt-0.5 min-h-11 w-full min-w-[8.5rem] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    value={stFilter}
                    onChange={(e) => setStFilter(e.target.value as StatusFilter)}
                    disabled={isPending}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={onClear}
                  className={buttonSecondary + " min-h-11 w-full min-w-0 sm:w-auto md:hidden"}
                  disabled={isPending}
                >
                  Clear week
                </button>
              </div>
            </div>

            {!hasAny ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-sm transition duration-200 md:min-h-[320px]">
                <p className="text-sm text-gray-600">No posts scheduled for this week.</p>
                <button
                  type="button"
                  onClick={onGenerate}
                  className={buttonPrimary + " min-h-11 w-full max-w-sm"}
                  disabled={isPending}
                >
                  {isPending ? "Working…" : "Generate week"}
                </button>
              </div>
            ) : (
              <div className="animate-fade-in-up max-md:pb-2 md:overflow-x-auto">
                <div className="grid grid-cols-1 gap-6 md:min-w-0 md:grid-cols-7 md:gap-3">
                  {dayLabels.map((day, d) => (
                    <div
                      key={day}
                      id={`scheduler-day-${d}`}
                      className="space-y-2.5 max-md:scroll-mt-4"
                    >
                      <div className="px-0.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {day}
                        </p>
                        <p className="text-xs text-gray-500">{dayLabel(monday, d)}</p>
                      </div>
                      <div className="flex flex-col gap-2 max-md:gap-2.5">
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
                              monday={monday}
                              hoursByDay={hoursByDay}
                              onCaptionUpdate={onCaptionUpdate}
                              onCaptionCommit={onCaptionCommit}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DragOverlay
              dropAnimation={null}
              className="z-50 w-[min(100vw-2rem,20rem)]"
            >
              {activeCell ? (
                <div className="scale-[1.02] shadow-2xl transition-transform duration-200">
                  <SchedulerCard
                    cell={activeCell}
                    className="cursor-grabbing"
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </AppLayout>

      {/* Sticky mobile actions: above bottom tab bar */}
      <div
        className="pointer-events-none fixed inset-x-0 z-30 md:hidden"
        style={{
          bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className={cn(
            SHELL_MAX,
            SHELL_PX,
            "pointer-events-auto border-t border-gray-200/80 bg-white/90 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] backdrop-blur-md",
          )}
        >
          <div className="flex min-h-14 items-stretch gap-2 py-1.5">
            <button
              type="button"
              onClick={onGenerate}
              className={buttonPrimary + " min-h-12 flex-1 text-base font-medium active:scale-[0.97]"}
              disabled={isPending}
            >
              {isPending ? "…" : "Generate week"}
            </button>
            <Link
              href="/inventory"
              className={buttonSecondary + " min-h-12 flex-1 text-center text-base font-medium active:scale-[0.97]"}
            >
              Pick bike
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
