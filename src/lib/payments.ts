import type { Database } from "@/types/database";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];

export type PaymentState = {
  total: number;
  paid: number;
  remaining: number;
  isPaid: boolean;
  statusTag: 'unpaid' | 'partial' | 'paid' | 'canceled';
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
export function computePaymentState(r: ReservationRow): PaymentState {
  const total = toNumberSafe(r.amount_total_jpy);
  const paid = toNumberSafe(r.paid_amount_jpy);
  const remaining = Math.max(0, total - paid);
  
  // キャンセル済みの場合は支払いUI非表示
  if (r.status === 'canceled') {
    return {
      total,
      paid,
      remaining,
      isPaid: false,
      statusTag: 'canceled',
      shouldShowPaymentUI: false,
    };
  }
  
  let statusTag: 'unpaid' | 'partial' | 'paid';
  let isPaid: boolean;
  
  if (remaining <= 0 && total > 0) {
    statusTag = 'paid';
    isPaid = true;
  } else if (paid > 0 && remaining > 0) {
    statusTag = 'partial';
    isPaid = false;
  } else {
    statusTag = 'unpaid';
    isPaid = false;
  }
  
  return {
    total,
    paid,
    remaining,
    isPaid,
    statusTag,
    shouldShowPaymentUI: true,
  };
}