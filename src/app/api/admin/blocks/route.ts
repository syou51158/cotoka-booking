import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getBlocksByDay, createBlock } from "@/server/blocks";

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get("day");
    const staffId = searchParams.get("staffId") || undefined;
    const day = dayParam ? new Date(dayParam) : new Date();
    const blocks = await getBlocksByDay(day, staffId);
    return NextResponse.json(blocks);
  } catch (err: any) {
    console.error("[GET] /api/admin/blocks", err);
    return NextResponse.json({ error: err.message || "Failed to fetch blocks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    if (!body.staff_id || !body.start_at || !body.end_at || !body.block_type) {
      return NextResponse.json({ error: "staff_id, start_at, end_at, block_type are required" }, { status: 400 });
    }
    if (new Date(body.start_at) >= new Date(body.end_at)) {
      return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
    }
    const created = await createBlock({
      staff_id: body.staff_id,
      start_at: body.start_at,
      end_at: body.end_at,
      block_type: body.block_type,
      note: body.note,
    });
    return NextResponse.json(created);
  } catch (err: any) {
    console.error("[POST] /api/admin/blocks", err);
    return NextResponse.json({ error: err.message || "Failed to create block" }, { status: 500 });
  }
}

