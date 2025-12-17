import { NextRequest, NextResponse } from "next/server";
import { getDateOverrides, createDateOverride, deleteDateOverride } from "@/server/schedule";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * 臨時休業・特別営業日一覧を取得
 * GET /api/admin/schedule/date-overrides
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const overrides = await getDateOverrides();
    return NextResponse.json(overrides);
  } catch (err: any) {
    console.error("[GET] /api/admin/schedule/date-overrides", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch date overrides" },
      { status: 500 }
    );
  }
}

/**
 * 臨時営業日を追加
 * POST /api/admin/schedule/date-overrides
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const body = await request.json();
    if (!body.date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    const created = await createDateOverride({
      date: body.date,
      open_at: body.open_at || null,
      close_at: body.close_at || null,
      is_open: body.is_open ?? false,
      note: body.note || null,
    });
    return NextResponse.json(created);
  } catch (err: any) {
    console.error("[POST] /api/admin/schedule/date-overrides", err);
    return NextResponse.json(
      { error: err.message || "Failed to create date override" },
      { status: 500 }
    );
  }
}

/**
 * 臨時営業日を削除
 * DELETE /api/admin/schedule/date-overrides?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    await deleteDateOverride(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE] /api/admin/schedule/date-overrides", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete date override" },
      { status: 500 }
    );
  }
}