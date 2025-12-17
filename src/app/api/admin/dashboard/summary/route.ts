import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getDashboardSummary } from "@/server/admin-dashboard";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.success) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const from =
    url.searchParams.get("from") ?? startOfMonth(now).toISOString();
  const to = url.searchParams.get("to") ?? endOfMonth(now).toISOString();

  try {
    const data = await getDashboardSummary(from, to);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to fetch dashboard summary" },
      { status: 500 }
    );
  }
}
