import type { SupabaseClient } from "@supabase/supabase-js";

export type MediaInsertRow = {
  bike_id: string;
  file_url: string;
  type: "image" | "video";
  status: "ready" | "processing" | "failed";
  original_url?: string | null;
  compressed_url?: string | null;
  processing_error?: string | null;
};

export type InsertMediaResult =
  | { ok: true; id: string; status: string; wasDuplicate: boolean }
  | { ok: false; message: string };

/**
 * Inserts a media row. If (bike_id, file_url) already exists, returns the
 * existing row and wasDuplicate: true (Postgres unique 23505).
 */
export async function insertMediaRow(
  s: SupabaseClient,
  row: MediaInsertRow,
): Promise<InsertMediaResult> {
  const { data, error } = await s
    .from("media")
    .insert(row)
    .select("id, status")
    .single();

  if (!error && data) {
    return {
      ok: true,
      id: data.id,
      status: data.status,
      wasDuplicate: false,
    };
  }

  if (error?.code === "23505") {
    const { data: existing, error: exErr } = await s
      .from("media")
      .select("id, status")
      .eq("bike_id", row.bike_id)
      .eq("file_url", row.file_url)
      .single();

    if (exErr || !existing) {
      return {
        ok: false,
        message: exErr?.message ?? "Duplicate key but no matching row",
      };
    }
    return {
      ok: true,
      id: existing.id,
      status: existing.status,
      wasDuplicate: true,
    };
  }

  return { ok: false, message: error?.message ?? "Insert failed" };
}
