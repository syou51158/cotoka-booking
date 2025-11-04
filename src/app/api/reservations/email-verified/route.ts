import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rid = url.searchParams.get("rid");
    if (!rid) {
      return NextResponse.json({ error: "rid is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("id, email_verified_at")
      .eq("id", rid)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const verifiedAt = (data as any)?.email_verified_at as string | null;
    return NextResponse.json({
      verified: !!verifiedAt,
      email_verified_at: verifiedAt ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
