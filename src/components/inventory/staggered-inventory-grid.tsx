"use client";

import type { InventoryBike } from "@/lib/inventory-list";
import { InventoryBikeCard } from "@/components/inventory/inventory-bike-card";

export function StaggeredInventoryGrid({ bikes }: { bikes: InventoryBike[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 max-md:gap-5 max-md:pb-1">
      {bikes.map((b, i) => (
        <div
          key={b.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${Math.min(i, 16) * 35}ms` }}
        >
          <InventoryBikeCard bike={b} />
        </div>
      ))}
    </div>
  );
}
