import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getReservationPaymentHistory } from "@/server/admin";

export async function GET(req: Request) {
  const auth = await verifyAdminAuth(req);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 },
    );
  }
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
