import { NextRequest, NextResponse } from "next/server";
import { getEffectiveStaff } from "@/lib/api-auth";
import { getTodayAttendance } from "@/server/attendance";

export async function GET(req: NextRequest) {
  const auth = await getEffectiveStaff(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const data = await getTodayAttendance(auth.staff.id);
    // Include role in the response
    return NextResponse.json({
      ...(data || { status: null }),
      role: auth.staff.role
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}
