import { NextResponse } from "next/server";
import { format } from "date-fns";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getAdminReservations } from "@/server/admin";
import { computePaymentState } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401 },
    );
  }
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

  const status =
    statusParam && statusParam !== "all" ? (statusParam as any) : undefined;

  try {
    const items = await getAdminReservations({
      from,
      to,
      staffId: staffId && staffId !== "all" ? staffId : undefined,
      serviceId: serviceId && serviceId !== "all" ? serviceId : undefined,
      status,
    });

    const filtered = items.filter((r) => {
      const state = computePaymentState(r);
      if (payParam === "unpaid") return state.statusTag === "unpaid";
      if (payParam === "partial") return state.statusTag === "partial";
      if (payParam === "paid") return state.statusTag === "paid";
      if (payParam === "canceled") return state.statusTag === "canceled";
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

    const stateJp = (state: "paid" | "partial" | "unpaid" | "canceled") =>
      state === "paid"
        ? "支払い済み"
        : state === "partial"
          ? "一部入金"
          : state === "canceled"
            ? "キャンセル"
            : "未収";

    const rows = filtered.map((r) => {
      const start = format(new Date(r.start_at), "yyyy/MM/dd HH:mm");
      const end = format(new Date(r.end_at), "yyyy/MM/dd HH:mm");
      const state = computePaymentState(r);
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
        state.total,
        state.paid,
        state.remaining,
        stateJp(state.statusTag),
      ]
        .map(escape)
        .join(",");
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
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
