import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * スタッフ一覧を取得
 * GET /api/admin/staff
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("id, display_name, email, active, created_at")
      .order("display_name", { ascending: true });

    if (error) throw error;

    // UI 互換のため display_name → name に合わせる
    const normalized = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.display_name,
      email: row.email,
      is_active: row.active,
      created_at: row.created_at,
    }));
    
    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error("[GET] /api/admin/staff", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch staff" },
      { status: 500 }
    );
  }
}