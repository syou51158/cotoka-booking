import { NextRequest, NextResponse } from "next/server";
import { updateShift, deleteShift } from "@/server/shifts";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * シフトを更新
 * PUT /api/admin/shifts/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request);
    
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Shift ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await updateShift(id, body);
    
    return NextResponse.json(updated);
  } catch (err: any) {
    const { id } = await params;
    console.error(`[PUT] /api/admin/shifts/${id}`, err);
    return NextResponse.json(
      { error: err.message || "Failed to update shift" },
      { status: 500 }
    );
  }
}

/**
 * シフトを削除
 * DELETE /api/admin/shifts/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request);
    
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Shift ID is required" },
        { status: 400 }
      );
    }

    await deleteShift(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const { id } = await params;
    console.error(`[DELETE] /api/admin/shifts/${id}`, err);
    return NextResponse.json(
      { error: err.message || "Failed to delete shift" },
      { status: 500 }
    );
  }
}