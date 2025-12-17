import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

export async function getStaffByUserId(userId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching staff by user_id:", error);
    return null;
  }
  return data as StaffRow | null;
}

export async function getAllStaff() {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("display_name");

  if (error) {
    console.error("Error fetching all staff:", error);
    return [];
  }
  return data as StaffRow[];
}
