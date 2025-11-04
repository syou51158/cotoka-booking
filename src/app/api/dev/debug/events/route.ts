import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  if (process.env.ALLOW_DEV_MOCKS !== "true") {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const reservationId = url.searchParams.get("rid");
  const typePrefix = url.searchParams.get("typePrefix") ?? undefined;

  try {
    const supabase = createSupabaseServiceRoleClient();
    let query = supabase
      .from("events")
      .select("id, created_at, type, payload")
      .order("created_at", { ascending: false })
      .limit(50);

    if (reservationId) {
      // payload に reservation_id が含まれるイベントで絞り込み
      query = query.contains("payload", { reservation_id: reservationId });
    }

    if (typePrefix) {
      query = query.ilike("type", `${typePrefix}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    console.error("Debug events fetch failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
