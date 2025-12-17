import { NextRequest, NextResponse } from "next/server";
import { getOpeningHours, updateOpeningHours } from "@/server/schedule";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * 曜日別営業時間を取得
 * GET /api/admin/schedule/opening-hours
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const hours = await getOpeningHours();
    return NextResponse.json(hours);
  } catch (err: any) {
    console.error("[GET] /api/admin/schedule/opening-hours", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch opening hours" },
      { status: 500 }
    );
  }
}

/**
 * 曜日別営業時間を更新
 * PUT /api/admin/schedule/opening-hours
 */
export async function PUT(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const body = await request.json();
    if (!Array.isArray(body.hours)) {
      return NextResponse.json(
        { error: "hours must be an array" },
        { status: 400 }
      );
    }

    const updated = await updateOpeningHours(body.hours);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT] /api/admin/schedule/opening-hours", err);
    return NextResponse.json(
      { error: err.message || "Failed to update opening hours" },
      { status: 500 }
    );
  }
}