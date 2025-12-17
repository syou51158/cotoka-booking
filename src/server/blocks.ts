import { supabaseAdmin } from "@/lib/supabase";
import { revalidateTag } from "next/cache";

const admin = supabaseAdmin as any;

export type StaffBlockRow = {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  block_type: "task" | "break" | "walk_in";
  note: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string;
    name: string;
    email: string;
  };
};

export type StaffBlockInput = {
  staff_id: string;
  start_at: string;
  end_at: string;
  block_type: StaffBlockRow["block_type"];
  note?: string;
};

export async function getBlocksByDay(day: Date, staffId?: string): Promise<StaffBlockRow[]> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  let query = admin
    .from("staff_blocks")
    .select(`*, staff:staff_id(id, name:display_name, email)`) 
    .gte("start_at", start.toISOString())
    .lte("start_at", end.toISOString())
    .order("start_at", { ascending: true });

  if (staffId) {
    query = query.eq("staff_id", staffId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StaffBlockRow[];
}

export async function createBlock(input: StaffBlockInput): Promise<StaffBlockRow> {
  const startAt = new Date(input.start_at);
  const endAt = new Date(input.end_at);
  if (endAt <= startAt) {
    throw new Error("終了時刻は開始時刻より後である必要があります");
  }

  const { data: overlapping } = await admin
    .from("staff_blocks")
    .select("id")
    .eq("staff_id", input.staff_id)
    .lt("start_at", input.end_at)
    .gt("end_at", input.start_at);

  if (overlapping && overlapping.length > 0) {
    throw new Error("この時間帯は既にブロックが登録されています");
  }

  const { data, error } = await admin
    .from("staff_blocks")
    .insert({
      staff_id: input.staff_id,
      start_at: new Date(input.start_at).toISOString(),
      end_at: new Date(input.end_at).toISOString(),
      block_type: input.block_type,
      note: input.note ?? null,
    })
    .select(`*, staff:staff_id(id, name:display_name, email)`) 
    .single();

  if (error) throw error;
  if (!data) throw new Error("作成後のデータが取得できませんでした");

  revalidateTag("staff_blocks");
  return data as StaffBlockRow;
}

export async function updateBlock(blockId: string, updates: Partial<StaffBlockInput>): Promise<StaffBlockRow> {
  if (updates.start_at && updates.end_at) {
    const startAt = new Date(updates.start_at);
    const endAt = new Date(updates.end_at);
    if (endAt <= startAt) {
      throw new Error("終了時刻は開始時刻より後である必要があります");
    }
  }

  if (updates.start_at || updates.end_at) {
    const { data: current } = await admin
      .from("staff_blocks")
      .select("staff_id, start_at, end_at")
      .eq("id", blockId)
      .single();

    if (current) {
      const startAt = updates.start_at || current.start_at;
      const endAt = updates.end_at || current.end_at;
      const staffId = updates.staff_id || current.staff_id;

      const { data: overlapping } = await admin
        .from("staff_blocks")
        .select("id")
        .eq("staff_id", staffId)
        .neq("id", blockId)
        .lt("start_at", endAt)
        .gt("end_at", startAt);

      if (overlapping && overlapping.length > 0) {
        throw new Error("この時間帯は既にブロックが登録されています");
      }
    }
  }

  const { data, error } = await admin
    .from("staff_blocks")
    .update({
      ...updates,
      start_at: updates.start_at ? new Date(updates.start_at).toISOString() : undefined,
      end_at: updates.end_at ? new Date(updates.end_at).toISOString() : undefined,
    })
    .eq("id", blockId)
    .select(`*, staff:staff_id(id, name:display_name, email)`) 
    .single();

  if (error) throw error;
  if (!data) throw new Error("更新後のデータが取得できませんでした");

  revalidateTag("staff_blocks");
  return data as StaffBlockRow;
}

export async function deleteBlock(blockId: string): Promise<void> {
  const { error } = await admin.from("staff_blocks").delete().eq("id", blockId);
  if (error) throw error;
  revalidateTag("staff_blocks");
}

