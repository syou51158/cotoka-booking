import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { updateBlock, deleteBlock } from "@/server/blocks";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Block ID is required" }, { status: 400 });
    }
    const body = await request.json();
    const updated = await updateBlock(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    const { id } = await params;
    console.error(`[PUT] /api/admin/blocks/${id}`, err);
    return NextResponse.json({ error: err.message || "Failed to update block" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Block ID is required" }, { status: 400 });
    }
    await deleteBlock(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const { id } = await params;
    console.error(`[DELETE] /api/admin/blocks/${id}`, err);
    return NextResponse.json({ error: err.message || "Failed to delete block" }, { status: 500 });
  }
}

