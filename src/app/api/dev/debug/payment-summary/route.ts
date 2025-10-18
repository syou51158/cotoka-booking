import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPaymentSummary } from "@/server/payments";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const allow = env.ALLOW_DEV_MOCKS === "true" && env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true";
  if (!allow) {
    return NextResponse.json({ error: "Not allowed in this environment" }, { status: 403 });
  }

  const url = new URL(request.url);
  const rid = url.searchParams.get("rid");
  if (!rid) {
    return NextResponse.json({ error: "rid is required" }, { status: 400 });
  }

  const summary = await getPaymentSummary(rid);

  const supabase = createSupabaseServiceRoleClient() as any;
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("id, status, amount_total_jpy")
    .eq("id", rid)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    reservationId: summary.reservationId,
    amountTotal: summary.amountTotal,
    paidTotal: summary.paidTotal,
    remaining: summary.remaining,
    paymentState: summary.paymentState,
    latestMethod: summary.latestMethod,
    latestAt: summary.latestAt,
    sources: summary.sources,
    reservation_status: reservation?.status ?? null,
    reservation_amount_total_jpy: reservation?.amount_total_jpy ?? null,
  });
}