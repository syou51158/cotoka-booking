import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidateTag } from "next/cache";

export type OpeningHoursRow = {
  id: string;
  weekday: number;
  open_at: string;
  close_at: string;
  is_open: boolean;
};

export type DateOverrideRow = {
  id: string;
  date: string;
  open_at: string | null;
  close_at: string | null;
  is_open: boolean;
  note: string | null;
};

export type OpeningHoursInput = {
  weekday: number;
  open_at: string;
  close_at: string;
  is_open: boolean;
};

export type DateOverrideInput = {
  date: string;
  open_at?: string | null;
  close_at?: string | null;
  is_open: boolean;
  note?: string | null;
};

/**
 * 曜日別営業時間を取得
 */
export async function getOpeningHours(): Promise<OpeningHoursRow[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("opening_hours")
    .select("*")
    .order("weekday", { ascending: true });

  if (error) throw error;
  return data as OpeningHoursRow[];
}

/**
 * 曜日別営業時間を一括更新（upsert）
 */
export async function updateOpeningHours(
  hours: OpeningHoursInput[]
): Promise<OpeningHoursRow[]> {
  const supabaseAdmin = getSupabaseAdmin();
  // バリデーション
  for (const h of hours) {
    if (h.weekday < 0 || h.weekday > 6) {
      throw new Error("weekday must be 0-6 (Monday=0)");
    }
    if (!/^\d{2}:\d{2}$/.test(h.open_at) || !/^\d{2}:\d{2}$/.test(h.close_at)) {
      throw new Error("open_at and close_at must be HH:MM format");
    }
  }

  const { data, error } = await supabaseAdmin
    .from("opening_hours")
    .upsert(
      hours.map((h) => ({
        weekday: h.weekday,
        open_at: h.open_at,
        close_at: h.close_at,
        is_open: h.is_open,
      })),
      { onConflict: "weekday" }
    )
    .select("*")
    .order("weekday", { ascending: true });

  if (error) throw error;

  // キャッシュ無効化
  revalidateTag("opening_hours");

  return data as OpeningHoursRow[];
}

/**
 * 臨時休業・特別営業日一覧を取得
 */
export async function getDateOverrides(): Promise<DateOverrideRow[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("date_overrides")
    .select("*")
    .order("date", { ascending: true });

  if (error) throw error;
  return data as DateOverrideRow[];
}

/**
 * 臨時営業日を追加
 */
export async function createDateOverride(
  input: DateOverrideInput
): Promise<DateOverrideRow> {
  const supabaseAdmin = getSupabaseAdmin();
  // バリデーション
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("date must be YYYY-MM-DD format");
  }
  if (input.open_at && !/^\d{2}:\d{2}$/.test(input.open_at)) {
    throw new Error("open_at must be HH:MM format");
  }
  if (input.close_at && !/^\d{2}:\d{2}$/.test(input.close_at)) {
    throw new Error("close_at must be HH:MM format");
  }

  const { data, error } = await supabaseAdmin
    .from("date_overrides")
    .insert({
      date: input.date,
      open_at: input.open_at ?? null,
      close_at: input.close_at ?? null,
      is_open: input.is_open,
      note: input.note ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  // キャッシュ無効化
  revalidateTag("date_overrides");

  return data as DateOverrideRow;
}

/**
 * 臨時営業日を削除
 */
export async function deleteDateOverride(id: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from("date_overrides")
    .delete()
    .eq("id", id);

  if (error) throw error;

  // キャッシュ無効化
  revalidateTag("date_overrides");
}
