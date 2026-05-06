import Link from "next/link";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/page-header";
import { TopPerformingBikes } from "@/components/leaderboard/top-performing-bikes";
import {
  getTopPerformingPosts,
  type LeaderboardTimeRange,
} from "@/lib/leaderboard-data";
import { cn } from "@/lib/cn";

type Props = { searchParams: Promise<{ range?: string }> };

function parseRange(s: string | undefined): LeaderboardTimeRange {
  if (s === "week" || s === "month" || s === "all") return s;
  return "all";
}

const tabs: { id: LeaderboardTimeRange; label: string }[] = [
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
  { id: "all", label: "All time" },
];

export default async function LeaderboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const timeRange = parseRange(sp?.range);
  const { rows, error } = await getTopPerformingPosts(32, timeRange);

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Engagement for posted content (likes + comments × 2)."
      />
      <AppLayout>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.id === "all" ? "/leaderboard" : `/leaderboard?range=${t.id}`}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-sm font-medium transition",
                timeRange === t.id
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <TopPerformingBikes
          rows={rows}
          error={error}
          variant="page"
        />
      </AppLayout>
    </>
  );
}
