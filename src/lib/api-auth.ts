import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getEffectiveStaff(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Unauthorized" as const, status: 401 };
  }

  // Fetch the staff profile linked to the logged-in user
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffError) {
    return { error: staffError.message || "Failed to fetch staff profile", status: 500 };
  }
  
  // If no staff profile found for this user
  if (!staff) {
    return { error: "Staff profile not found", status: 404 };
  }

  // Check if the user is an Admin and wants to act as another staff
  const requestedStaffId = req.headers.get("x-staff-id");
  
  if (staff.role === 'admin' && requestedStaffId) {
    // Verify the requested staff exists
    const { data: targetStaff, error: targetError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", requestedStaffId)
      .single();

    if (targetError || !targetStaff) {
        return { error: "Target staff not found", status: 404 };
    }

    return { supabase, staff: targetStaff, isMasquerading: true };
  }

  // Regular staff or Admin acting as themselves
  return { supabase, staff, isMasquerading: false };
}
