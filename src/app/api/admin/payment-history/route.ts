import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getReservationPaymentHistory } from "@/server/admin";

export async function GET(req: Request) {
  requireAdmin();
  const url = new URL(req.url);
  const rid = url.searchParams.get("rid");
  if (!rid) {
    return NextResponse.json({ error: "rid is required" }, { status: 400 });
  }

  try {
    const items = await getReservationPaymentHistory(rid);
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}