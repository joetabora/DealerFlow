"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { restoreAllSoldBikesToAvailable } from "@/app/(dashboard)/inventory/actions";
import { buttonPrimary } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = { soldCount: number };

export function RestoreSoldBikesBanner({ soldCount }: Props) {
  const { show } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    if (
      soldCount <= 0 ||
      !confirm(
        `Move all ${soldCount} sold bike(s) back to in stock? After that you can delete any unit you truly no longer carry.`,
      )
    ) {
      return;
    }
    start(async () => {
      const r = await restoreAllSoldBikesToAvailable();
      if (r.ok) {
        show(`Restored ${r.updated ?? soldCount} bike(s) to in stock.`, "success");
        router.refresh();
      } else {
        show(r.error, "error");
      }
    });
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <p className="text-sm leading-relaxed text-gray-800">
        <span className="font-medium">Bulk restore:</span> put every bike currently marked sold
        back on the in-stock list—then delete only the listings you intend to drop.
      </p>
      <button
        type="button"
        disabled={pending || soldCount <= 0}
        onClick={() => run()}
        className={buttonPrimary + " mt-4 min-h-11"}
      >
        {pending ? "Working…" : `Restore ${soldCount} sold to in stock`}
      </button>
    </div>
  );
}

