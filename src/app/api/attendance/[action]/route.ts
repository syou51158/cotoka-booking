import { NextRequest, NextResponse } from "next/server";
import { getEffectiveStaff } from "@/lib/api-auth";
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
} from "@/server/attendance";

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const auth = await getEffectiveStaff(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { action } = await params;
    let data;

    switch (action) {
      case "clock_in":
        data = await clockIn(auth.staff.id);
        break;
      case "clock_out":
        data = await clockOut(auth.staff.id);
        break;
      case "break_start":
        data = await startBreak(auth.staff.id);
        break;
      case "break_end":
        data = await endBreak(auth.staff.id);
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
