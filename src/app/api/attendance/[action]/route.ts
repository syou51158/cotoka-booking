import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getStaffByUserId } from "@/server/staff";
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
} from "@/server/attendance";

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await getStaffByUserId(user.id);
  if (!staff) {
    return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
  }

  try {
    const { action } = await params;
    let data;

    switch (action) {
      case "clock_in":
        data = await clockIn(staff.id);
        break;
      case "clock_out":
        data = await clockOut(staff.id);
        break;
      case "break_start":
        data = await startBreak(staff.id);
        break;
      case "break_end":
        data = await endBreak(staff.id);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}
