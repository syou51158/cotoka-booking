import { NextResponse } from "next/server";
import { format } from "date-fns";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminReservations } from "@/server/admin";
import { getPaymentSummaries } from "@/server/payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  requireAdmin();
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const staffId = url.searchParams.get("staff") ?? undefined;
  const serviceId = url.searchParams.get("service") ?? undefined;
  const statusParam = url.searchParams.get("status") ?? undefined;
  const payParam = url.searchParams.get("pay") ?? undefined;

  if (!from || !to) {
    return NextResponse.json({ error: "from/to is required" }, { status: 400 });
  }

  const status = statusParam && statusParam !== "all" ? (statusParam as any) : undefined;

  try {
    const items = await getAdminReservations({
      from,
      to,
      staffId: staffId && staffId !== "all" ? staffId : undefined,
      serviceId: serviceId && serviceId !== "all" ? serviceId : undefined,
      status,
    });

    const summaries = await getPaymentSummaries(items.map((r) => r.id));
    const filtered = items.filter((r) => {
      const s = summaries[r.id];
      if (payParam === "unpaid") return s?.paymentState === "unpaid";
      if (payParam === "partial") return s?.paymentState === "partially_paid";
      if (payParam === "paid") return s?.paymentState === "paid";
      return true;
    });

    const header = [
      "予約ID",
      "予約番号",
      "ステータス",
      "メニュー",
      "担当",
      "開始日時",
      "終了日時",
      "お客さま",
      "メール",
      "電話",
      "金額合計",
      "入金済み",
      "残額",
      "支払い状態",
    ];

    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const stateJp = (state: "paid" | "partially_paid" | "unpaid") =>
      state === "paid"
        ? "支払い済み"
        : state === "partially_paid"
        ? "一部入金"
        : "未収";

    const rows = filtered.map((r) => {
      const start = format(new Date(r.start_at), "yyyy/MM/dd HH:mm");
      const end = format(new Date(r.end_at), "yyyy/MM/dd HH:mm");
      const s = summaries[r.id];
      const paid = s?.paidTotal ?? 0;
      const remaining = s?.remaining ?? Math.max(r.amount_total_jpy - (r.paid_amount_jpy ?? 0), 0);
      return [
        r.id,
        r.code,
        r.status,
        r.service?.name ?? "",
        r.staff?.display_name ?? "",
        start,
        end,
        r.customer_name ?? "",
        r.customer_email ?? "",
        r.customer_phone ?? "",
        r.amount_total_jpy,
        paid,
        remaining,
        stateJp(s?.paymentState ?? "unpaid"),
      ].map(escape).join(",");
    });

    const csvBody = [header.join(","), ...rows].join("\n");
    const bom = "\uFEFF";
    const filename = `reservations-${format(new Date(), "yyyyMMdd")}.csv`;

    return new Response(bom + csvBody, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}