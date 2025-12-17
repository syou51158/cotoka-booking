import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { differenceInMinutes } from "date-fns";

export async function getTodayAttendance(
  staffId: string,
  supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()
) {
  // Use Japan time for date part if possible, but here simplifying with UTC date string
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("staff_id", staffId)
    .eq("date", today)
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

export async function clockIn(
  staffId: string,
  supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()
) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Check if already exists
  const existing = await getTodayAttendance(staffId, supabase);
  if (existing) throw new Error("Already clocked in today");

  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      staff_id: staffId,
      date: today,
      clock_in_at: now.toISOString(),
      status: "working",
      break_minutes: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function clockOut(
  staffId: string,
  supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()
) {
  const now = new Date();
  const existing = await getTodayAttendance(staffId, supabase);
  if (!existing) throw new Error("No attendance record found for today");
  if (existing.status === 'clocked_out') throw new Error("Already clocked out");

  // If breaking, end break first
  let breakMinutes = existing.break_minutes ?? 0;
  if (existing.status === 'break' && existing.last_break_start_at) {
    const start = new Date(existing.last_break_start_at);
    const diff = differenceInMinutes(now, start);
    breakMinutes += diff;
  }

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      clock_out_at: now.toISOString(),
      status: "clocked_out",
      break_minutes: breakMinutes,
      last_break_start_at: null
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function startBreak(
  staffId: string,
  supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()
) {
  const now = new Date();
  const existing = await getTodayAttendance(staffId, supabase);
  if (!existing) throw new Error("No attendance record found for today");
  if (existing.status !== 'working') throw new Error("Can only start break when working");

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      status: "break",
      last_break_start_at: now.toISOString()
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function endBreak(
  staffId: string,
  supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()
) {
  const now = new Date();
  const existing = await getTodayAttendance(staffId, supabase);
  if (!existing) throw new Error("No attendance record found for today");
  if (existing.status !== 'break') throw new Error("Not on break");
  if (!existing.last_break_start_at) throw new Error("Break start time missing");

  const start = new Date(existing.last_break_start_at);
  const diff = differenceInMinutes(now, start);
  const totalBreak = (existing.break_minutes ?? 0) + diff;

  const { data, error } = await supabase
    .from("attendance_records")
    .update({
      status: "working",
      break_minutes: totalBreak,
      last_break_start_at: null
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
