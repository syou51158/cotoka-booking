import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // 管理者認証チェック
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reservationId = searchParams.get("reservationId");

  if (!reservationId) {
    return NextResponse.json({ error: "reservationId is required" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    
    // email_sent と email_send_failed イベントを取得
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("payload->>reservation_id", reservationId)
      .in("type", ["email_sent", "email_send_failed"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch email events:", error);
      return NextResponse.json({ error: "Failed to fetch email history" }, { status: 500 });
    }

    // イベントデータを整形
    const emailHistory = events?.map((event: any) => ({
      id: event.id,
      type: event.type,
      timestamp: event.created_at,
      kind: event.payload?.kind || "unknown",
      recipient: event.payload?.to || event.payload?.customer_email || "unknown",
      messageId: event.payload?.messageId || event.payload?.email_id || null,
      provider: event.payload?.provider || "unknown",
      status: event.type === "email_sent" ? "success" : "failed",
      error: event.type === "email_send_failed" ? event.payload?.error : null,
      source: event.payload?.source || "system"
    })) || [];

    return NextResponse.json({ emailHistory });
  } catch (error) {
    console.error("Error fetching email history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}