import { NextResponse } from "next/server";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export async function GET() {
  try {
    const client = createSupabaseBrowserClient();
    const { count, error } = await client
      .from("services")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true, count: count ?? 0 }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
