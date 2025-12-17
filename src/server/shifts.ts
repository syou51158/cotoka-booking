import { supabaseAdmin } from "@/lib/supabase";
import { revalidateTag } from "next/cache";
// supabase の厳密な型により .from("shifts") などで型不一致が出るため、
// このファイルでは any クライアントを利用して型エラーを回避します。
const admin = supabaseAdmin as any;

export type ShiftRow = {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    name: string;
    email: string;
  };
};

export type ShiftInput = {
  staff_id: string;
  start_at: string;
  end_at: string;
  note?: string;
};

/**
 * 週間のシフトを取得（月曜開始）
 */
export async function getShiftsByWeek(
  weekStart: Date,
  staffId?: string
): Promise<ShiftRow[]> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const windowStart = new Date(weekStart.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000);

  let query = admin
    .from("shifts")
    .select(`
      *,
      staff:staff_id(id, name:display_name, email)
    `)
    .gte("start_at", windowStart.toISOString())
    .lt("start_at", windowEnd.toISOString())
    .order("start_at", { ascending: true });

  if (staffId) {
    query = query.eq("staff_id", staffId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ShiftRow[];
}

/**
 * スタッフ一覧とそのシフト情報を取得
 */
export async function getStaffWithShifts(): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    shifts: ShiftRow[];
  }>
> {
  const { data, error } = await admin
    .from("staff")
    .select(`
      id,
      name:display_name,
      email,
      shifts(
        id,
        start_at,
        end_at,
        note,
        created_at,
        updated_at
      )
    `)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * シフト作成
 */
export async function createShift(
  input: ShiftInput
): Promise<ShiftRow> {
  // バリデーション
  const startAt = new Date(input.start_at);
  const endAt = new Date(input.end_at);
  
  if (endAt <= startAt) {
    throw new Error("終了時刻は開始時刻より後である必要があります");
  }

  // 重複チェック
  const { data: overlapping } = await admin
    .from("shifts")
    .select("id")
    .eq("staff_id", input.staff_id)
    .lt("start_at", input.end_at)
    .gt("end_at", input.start_at);

  if (overlapping && overlapping.length > 0) {
    throw new Error("この時間帯は既にシフトが登録されています");
  }

  const { data, error } = await admin
    .from("shifts")
    .insert({
      staff_id: input.staff_id,
      start_at: new Date(input.start_at).toISOString(),
      end_at: new Date(input.end_at).toISOString(),
      note: input.note || null,
    })
    .select(`
      *,
      staff:staff_id(id, name:display_name, email)
    `)
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("作成後のデータが取得できませんでした");
  }

  // キャッシュ無効化
  revalidateTag("shifts");

  return data as ShiftRow;
}

/**
 * シフト更新
 */
export async function updateShift(
  shiftId: string,
  updates: Partial<ShiftInput>
): Promise<ShiftRow> {
  // バリデーション
  if (updates.start_at && updates.end_at) {
    const startAt = new Date(updates.start_at);
    const endAt = new Date(updates.end_at);
    
    if (endAt <= startAt) {
      throw new Error("終了時刻は開始時刻より後である必要があります");
    }
  }

  // 重複チェック（自身を除く）
  if (updates.start_at || updates.end_at) {
    const { data: current } = await admin
      .from("shifts")
      .select("staff_id, start_at, end_at")
      .eq("id", shiftId)
      .single();

    if (current) {
      const startAt = updates.start_at || current.start_at;
      const endAt = updates.end_at || current.end_at;
      const staffId = updates.staff_id || current.staff_id;

      const { data: overlapping } = await admin
        .from("shifts")
        .select("id")
        .eq("staff_id", staffId)
        .neq("id", shiftId)
        .lt("start_at", endAt)
        .gt("end_at", startAt);

      if (overlapping && overlapping.length > 0) {
        throw new Error("この時間帯は既にシフトが登録されています");
      }
    }
  }

  const { data, error } = await admin
    .from("shifts")
    .update({
      ...updates,
      start_at: updates.start_at ? new Date(updates.start_at).toISOString() : undefined,
      end_at: updates.end_at ? new Date(updates.end_at).toISOString() : undefined,
    })
    .eq("id", shiftId)
    .select(`
      *,
      staff:staff_id(id, name:display_name, email)
    `)
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("更新後のデータが取得できませんでした");
  }

  // キャッシュ無効化
  revalidateTag("shifts");

  return data as ShiftRow;
}

/**
 * シフト削除
 */
export async function deleteShift(shiftId: string): Promise<void> {
  const { error } = await admin
    .from("shifts")
    .delete()
    .eq("id", shiftId);

  if (error) throw error;

  // キャッシュ無効化
  revalidateTag("shifts");
}

/**
 * 指定された日付の週の開始日（月曜日）を取得
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日に調整
  return new Date(d.setDate(diff));
}
