import { NextRequest, NextResponse } from "next/server";
import { getShiftsByWeek, createShift, getWeekStart } from "@/server/shifts";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * 週間シフト一覧を取得
 * GET /api/admin/shifts?week=YYYY-MM-DD&staffId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");
    const staffId = searchParams.get("staffId");

    const weekStart = weekParam
      ? getWeekStart(new Date(weekParam))
      : getWeekStart(new Date());

    const shifts = await getShiftsByWeek(weekStart, staffId || undefined);
    return NextResponse.json(shifts);
  } catch (err: any) {
    console.error("[GET] /api/admin/shifts", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch shifts" },
      { status: 500 }
    );
  }
}

/**
 * 新規シフトを作成
 * POST /api/admin/shifts
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const body = await request.json();
    if (!body.staff_id || !body.start_at || !body.end_at) {
      return NextResponse.json(
        { error: "staff_id, start_at, end_at are required" },
        { status: 400 }
      );
    }

    if (new Date(body.start_at) >= new Date(body.end_at)) {
      return NextResponse.json(
        { error: "end_at must be after start_at" },
        { status: 400 }
      );
    }

    const created = await createShift({
      staff_id: body.staff_id,
      start_at: body.start_at,
      end_at: body.end_at,
      note: body.note,
    });

    return NextResponse.json(created);
  } catch (err: any) {
    console.error("[POST] /api/admin/shifts", err);
    return NextResponse.json(
      { error: err.message || "Failed to create shift" },
      { status: 500 }
    );
  }
}