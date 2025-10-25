import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  if (process.env.ALLOW_DEV_MOCKS !== "true") {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const reservationId = url.searchParams.get("rid");
  if (!reservationId) {
    return NextResponse.json({ message: "rid is required" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("reservation_notifications")
      .select("id, reservation_id, kind, scheduled_at, sent_at")
      .eq("reservation_id", reservationId)
      .order("kind", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ notifications: data ?? [] });
  } catch (error) {
    console.error("Debug notifications fetch failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
