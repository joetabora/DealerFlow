import { NextResponse, type NextRequest } from "next/server";
import { normalizeCsvProfileId } from "@/lib/csv/profiles";
import { syncInventoryFromCsvText } from "@/lib/ingest/inventory-csv-sync";
import { createServiceRoleClient, hasServiceRoleKey } from "@/lib/supabase/admin";

/**
 * Scheduled inventory pull (Vercel Cron or manual hit with Bearer secret).
 * Uses service role Supabase client and logs to `csv_import_runs`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, {
      status: 401,
    });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 500 },
    );
  }

  const url = process.env.INV_CSV_SYNC_URL?.trim();
  if (!url) {
    return NextResponse.json(
      { ok: false, error: "INV_CSV_SYNC_URL is not set." },
      { status: 500 },
    );
  }

  const profile = normalizeCsvProfileId(process.env.INV_CSV_PROFILE);

  let text: string;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `CSV URL returned ${res.status}.` },
        { status: 502 },
      );
    }
    text = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  try {
    const supabase = createServiceRoleClient();
    const result = await syncInventoryFromCsvText(supabase, text, {
      source: "cron",
      profile,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, profile },
        { status: 422 },
      );
    }
    return NextResponse.json({
      ok: true,
      imported: result.imported,
      markedSold: result.markedSold,
      profile,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
