import { NextRequest, NextResponse } from "next/server";
import { getAllServices, createService } from "@/server/services";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * 全サービス一覧を取得（管理画面用）
 * GET /api/admin/services
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const services = await getAllServices();
    return NextResponse.json(services);
  } catch (err: any) {
    console.error("[GET] /api/admin/services", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch services" },
      { status: 500 }
    );
  }
}

/**
 * 新規サービスを作成
 * POST /api/admin/services
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const body = await request.json();
    if (!body.name || !body.duration_min || body.price_jpy === undefined) {
      return NextResponse.json(
        { error: "name, duration_min, price_jpy are required" },
        { status: 400 }
      );
    }

    const created = await createService({
      name: body.name,
      name_en: body.name_en,
      name_zh: body.name_zh,
      description: body.description,
      description_en: body.description_en,
      description_zh: body.description_zh,
      duration_min: body.duration_min,
      price_jpy: body.price_jpy,
      buffer_before_min: body.buffer_before_min || 0,
      buffer_after_min: body.buffer_after_min || 0,
      require_prepayment: body.require_prepayment || false,
      active: body.active !== undefined ? body.active : true,
    });
    
    return NextResponse.json(created);
  } catch (err: any) {
    console.error("[POST] /api/admin/services", err);
    return NextResponse.json(
      { error: err.message || "Failed to create service" },
      { status: 500 }
    );
  }
}