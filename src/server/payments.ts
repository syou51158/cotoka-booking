import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type PaymentSummary = {
  reservationId: string;
  amountTotal: number; // reservations.amount_total_jpy
  paidTotal: number; // events 合算（数値以外は0扱い）
  remaining: number; // max(0, amountTotal - paidTotal)
  paymentState: "unpaid" | "partially_paid" | "paid";
  latestMethod?: "cash" | "card" | "card_online" | "other";
  latestAt?: string; // ISO
  sources: Array<{
    type: "reservation_paid" | "reservation_settled";
    amount: number;
    method?: string;
    at: string;
  }>;
};

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];

function toNumberSafe(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function methodLabelFromEvent(type: string, payload: any): "cash" | "card" | "card_online" | "other" | undefined {
  const raw = typeof payload?.payment_method === "string" ? payload.payment_method : undefined;
  if (raw === "cash" || raw === "card" || raw === "card_online" || raw === "other") return raw;
  // 既存イベントの慣習に合わせたフォールバック
  if (type === "reservation_paid") return "card_online";
  if (type === "reservation_settled") return undefined; // 管理画面からの記録で method が入る想定
  return undefined;
}

export async function getPaymentSummaries(
  reservationIds: string[],
): Promise<Record<string, PaymentSummary>> {
  if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
    return {};
  }

  const supabase = createSupabaseServiceRoleClient() as any;

  // 予約本体（金額合計）をバルク取得
  const { data: reservations, error: resErr } = await supabase
    .from("reservations")
    .select("id, amount_total_jpy")
    .in("id", reservationIds);

  if (resErr) throw resErr;

  const amountById = new Map<string, number>();
  for (const r of (reservations ?? []) as Array<Pick<ReservationRow, "id" | "amount_total_jpy">>) {
    amountById.set(r.id, toNumberSafe((r as any).amount_total_jpy));
  }

  // 対象IDのイベントのみをまとめて取得（JSONフィールドに対する OR フィルタ）
  const orFilter = reservationIds.map((id) => `payload->>reservation_id.eq.${id}`).join(",");
  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("type, payload, created_at")
    .in("type", ["reservation_settled", "reservation_paid"])
    .or(orFilter);

  if (evErr) throw evErr;

  // 予約IDごとにイベントをグループ化
  const eventsById = new Map<string, Array<{ type: string; payload: any; created_at: string }>>();
  for (const row of (events ?? []) as Array<{ type: string; payload: any; created_at: string }>) {
    const rid = (row?.payload as any)?.reservation_id;
    if (!rid || typeof rid !== "string") continue;
    const list = eventsById.get(rid) ?? [];
    list.push(row);
    eventsById.set(rid, list);
  }

  const result: Record<string, PaymentSummary> = {};

  for (const rid of reservationIds) {
    const amountTotal = toNumberSafe(amountById.get(rid) ?? 0);
    const evs = (eventsById.get(rid) ?? []).slice();
    // 日時順（古→新）に並べ替え
    evs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const sources: PaymentSummary["sources"] = evs.map((row) => {
      const p = row.payload as any;
      const amount = toNumberSafe(p?.applied_amount_jpy ?? p?.paid_amount_jpy);
      const at = (typeof p?.payment_collected_at === "string" && p.payment_collected_at.length > 0)
        ? p.payment_collected_at
        : row.created_at;
      const method = methodLabelFromEvent(row.type, p);
      return {
        type: (row.type === "reservation_settled" ? "reservation_settled" : "reservation_paid") as const,
        amount,
        method,
        at,
      };
    });

    const paidTotal = sources.reduce((sum, s) => sum + (Number.isFinite(s.amount) ? s.amount : 0), 0);
    const remaining = Math.max(0, amountTotal - paidTotal);

    let paymentState: PaymentSummary["paymentState"]; 
    if (remaining === 0 && amountTotal > 0) {
      paymentState = "paid";
    } else if (paidTotal > 0 && remaining > 0) {
      paymentState = "partially_paid";
    } else {
      paymentState = "unpaid";
    }

    const latest = sources.length > 0 ? sources[sources.length - 1] : undefined;

    result[rid] = {
      reservationId: rid,
      amountTotal,
      paidTotal,
      remaining,
      paymentState,
      latestMethod: latest?.method,
      latestAt: latest?.at,
      sources,
    };
  }

  return result;
}

export async function getPaymentSummary(reservationId: string): Promise<PaymentSummary> {
  const summaries = await getPaymentSummaries([reservationId]);
  const base = summaries[reservationId];
  return (
    base ?? {
      reservationId,
      amountTotal: 0,
      paidTotal: 0,
      remaining: 0,
      paymentState: "unpaid",
      sources: [],
    }
  );
}