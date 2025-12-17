import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getStaffByUserId } from "@/server/staff";
import { getTodayAttendance } from "@/server/attendance";

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await getStaffByUserId(user.id);
  if (!staff) {
    return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
  }

  try {
    const data = await getTodayAttendance(staff.id);
    return NextResponse.json(data || { status: null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}
