import { getSupabaseAdmin } from "@/lib/supabase";
import { differenceInMinutes } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function getDashboardSummary(
  from: string,
  to: string,
  supabase?: SupabaseClient<Database>
) {
  const client = supabase ?? getSupabaseAdmin();
  const [sales, rewards, attendance] = await Promise.all([
    getSalesSummary(from, to, client),
    getRewardsSummary(from, to, client),
    getAttendanceSummary(from, to, client),
  ]);

  return { sales, rewards, attendance };
}

async function getSalesSummary(
  from: string,
  to: string,
  supabase: SupabaseClient<Database>
) {
  const { data, error } = await supabase
    .from("reservations")
    .select("amount_total_jpy, status, start_at")
    .gte("start_at", from)
    .lte("start_at", to)
    .in("status", ["paid", "confirmed"]);

  if (error) throw error;

  const total = (data || []).reduce((sum, r) => sum + r.amount_total_jpy, 0);
  const count = (data || []).length;
  return { total, count };
}

async function getRewardsSummary(
  from: string,
  to: string,
  supabase: SupabaseClient<Database>
) {
  const { data, error } = await supabase
    .from("treatment_rewards")
    .select("reward_amount_jpy, status, created_at")
    .gte("created_at", from)
    .lte("created_at", to)
    .neq("status", "draft");

  if (error) throw error;

  const total = (data || []).reduce((sum, r) => sum + r.reward_amount_jpy, 0);
  const count = (data || []).length;
  return { total, count };
}

async function getAttendanceSummary(
  from: string,
  to: string,
  supabase: SupabaseClient<Database>
) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("clock_in_at, clock_out_at, break_minutes, date")
    .gte("date", from.split("T")[0])
    .lte("date", to.split("T")[0])
    .eq("status", "clocked_out");

  if (error) throw error;

  let totalMinutes = 0;
  (data || []).forEach((r) => {
    if (r.clock_in_at && r.clock_out_at) {
      const start = new Date(r.clock_in_at);
      const end = new Date(r.clock_out_at);
      const diff = differenceInMinutes(end, start);
      totalMinutes += Math.max(0, diff - (r.break_minutes || 0));
    }
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return { totalMinutes, formatted: `${totalHours}h ${remainingMinutes}m` };
}

export async function getRealtimeStaffStatus(
  supabase?: SupabaseClient<Database>
) {
  const client = supabase ?? getSupabaseAdmin();
  // スタッフ一覧取得
  const { data: staff, error: staffError } = await client
    .from("staff")
    .select("id, display_name, color")
    .eq("active", true);

  if (staffError || !staff) return [];

  // 今日の勤怠を取得
  const today = new Date().toISOString().split('T')[0];
  const { data: attendance, error: attError } = await client
    .from("attendance_records")
    .select("*")
    .eq("date", today);

  if (attError) return [];

  // マージ
  return staff.map(s => {
    const record = attendance?.find(a => a.staff_id === s.id);
    return {
      ...s,
      attendance: record ? {
        status: record.status,
        clock_in_at: record.clock_in_at,
        last_break_start_at: record.last_break_start_at
      } : null
    };
  });
}
