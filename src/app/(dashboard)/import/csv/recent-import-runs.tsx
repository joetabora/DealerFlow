import { listRecentCsvImportRuns } from "./actions";

export async function RecentImportRuns() {
  const r = await listRecentCsvImportRuns(12);
  if (!r.ok) return null;

  const rows = r.rows;
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-xs text-gray-600">
        No import runs logged yet — after syncing, summaries appear here.
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Recent import runs
      </h3>
      <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-gray-100 bg-white p-2 text-xs text-gray-700">
        {rows.map((x) => (
          <li
            key={x.id}
            className={`flex flex-wrap items-baseline justify-between gap-1 rounded-lg px-1.5 py-1 ${x.ok ? "" : "bg-red-50"}`}
          >
            <span className="text-gray-500">
              {new Date(x.created_at).toLocaleString()}
            </span>
            <span className="font-medium text-gray-800">
              {x.source}
              {x.profile ? ` · ${x.profile}` : ""}{" "}
              {x.ok ? (
                <span className="font-normal text-emerald-800">
                  +{x.imported ?? 0} in stock · {x.marked_sold ?? 0} → sold
                </span>
              ) : (
                <span className="break-all text-red-800">
                  {x.error_message ?? "Failed"}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
