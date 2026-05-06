"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteBikeCompletely } from "@/app/(dashboard)/inventory/actions";
import { buttonSecondary } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = {
  bikeId: string;
  sku: string;
  title: string | null;
};

export function InventoryBikeDeleteFooter({ bikeId, sku, title }: Props) {
  const { show } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    const label = (title ?? "").trim() || sku;
    if (
      !confirm(
        `Remove "${label}" (${sku}) from DealerFlow? This deletes its photos, videos, scheduled posts (if any). This cannot be undone.`,
      )
    ) {
      return;
    }
    start(async () => {
      const r = await deleteBikeCompletely(bikeId);
      if (r.ok) {
        show("Bike removed.", "success");
        router.refresh();
      } else {
        show(r.error, "error");
      }
    });
  }

  return (
    <div className="border-t border-gray-100 px-4 pb-3 pt-3 max-md:px-5 max-md:pb-4">
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          run();
        }}
        className={
          buttonSecondary +
          " w-full text-center text-sm font-normal text-red-700 ring-red-100 hover:bg-red-50 hover:text-red-800"
        }
      >
        {pending ? "Removing…" : "Remove from DealerFlow…"}
      </button>
    </div>
  );
}
