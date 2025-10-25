import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  if (process.env.ALLOW_DEV_MOCKS !== "true") {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ message: "code is required" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ message: "not found" }, { status: 404 });
    }

    return NextResponse.json({ reservation: data });
  } catch (error) {
    console.error("Debug reservation fetch failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
