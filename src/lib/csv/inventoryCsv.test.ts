import { describe, expect, it } from "vitest";
import { parseInventoryCsvString } from "@/lib/csv/inventoryCsv";

describe("parseInventoryCsvString", () => {
  const header =
    "Stock Number,Model,Year,Price,Mileage,Location,Status\n";

  it("parses BOM and maps sold status", () => {
    const csv =
      "\uFEFF" +
      header +
      "U1,Bike Alpha,2024,12000,1000,Milwaukee,Available\nU2,Beta,,5000,,,Sold\n";
    const rows = parseInventoryCsvString(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.stock).toBe("U1");
    expect(rows[0]!.status).toBe("available");
    expect(rows[1]!.stock).toBe("U2");
    expect(rows[1]!.status).toBe("sold");
  });

  it("drops rows without stock number", () => {
    const csv = header + ",Model,,,,,\nU3,X,,,,,\n";
    const rows = parseInventoryCsvString(csv);
    expect(rows.map((r) => r.stock)).toEqual(["U3"]);
  });
});
