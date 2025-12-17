import { NextRequest, NextResponse } from "next/server";
import { getServiceById, updateService, deleteService } from "@/server/services";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * 単一サービスを取得
 * GET /api/admin/services/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request);
    
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const service = await getServiceById(id);
    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(service);
  } catch (err: any) {
    const { id } = await params;
    console.error(`[GET] /api/admin/services/${id}`, err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch service" },
      { status: 500 }
    );
  }
}

/**
 * サービスを更新
 * PUT /api/admin/services/[id]
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
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await updateService(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    const { id } = await params;
    console.error(`[PUT] /api/admin/services/${id}`, err);
    return NextResponse.json(
      { error: err.message || "Failed to update service" },
      { status: 500 }
    );
  }
}

/**
 * サービスを削除 (論理削除: active=false)
 * DELETE /api/admin/services/[id]
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
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    await deleteService(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const { id } = await params;
    console.error(`[DELETE] /api/admin/services/${id}`, err);
    return NextResponse.json(
      { error: err.message || "Failed to delete service" },
      { status: 500 }
    );
  }
}