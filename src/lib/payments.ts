import type { Database } from "@/types/database";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];

export type PaymentState = {
  total: number;
  paid: number;
  remaining: number;
  isPaid: boolean;
  statusTag: "unpaid" | "partial" | "paid" | "canceled";
  label: string;
  shouldShowPaymentUI: boolean;
};

function toNumberSafe(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * 予約の支払い状態を計算する単一ソース関数
 * 管理画面、CSV、サマリーの全てでこの関数の結果を使用する
 */
export function computePaymentState(r: {
  amount_total_jpy: number | null;
  paid_amount_jpy: number | null;
  status: string;
}): PaymentState {
  const total = toNumberSafe(r.amount_total_jpy);
  const paid = toNumberSafe(r.paid_amount_jpy);
  const remaining = Math.max(0, total - paid);

  // キャンセル済みの場合は支払いUI非表示
  if (r.status === "canceled") {
    return {
      total,
      paid,
      remaining,
      isPaid: false,
      statusTag: "canceled",
      label: "キャンセル済み",
      shouldShowPaymentUI: false,
    };
  }

  let statusTag: "unpaid" | "partial" | "paid";
  let isPaid: boolean;
  let label: string;

  if (remaining <= 0 && total > 0) {
    statusTag = "paid";
    isPaid = true;
    label = "支払い済み";
  } else if (paid > 0 && remaining > 0) {
    statusTag = "partial";
    isPaid = false;
    label = "一部支払い";
  } else {
    statusTag = "unpaid";
    isPaid = false;
    label = "未支払い";
  }

  return {
    total,
    paid,
    remaining,
    isPaid,
    statusTag,
    label,
    shouldShowPaymentUI: true,
  };
}
