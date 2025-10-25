"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { computePaymentState } from "@/lib/payments";
import type { Database } from "@/types/database";

interface HistoryItem {
  type: string;
  at: string;
  amount_jpy: number | null;
  method: string;
  source: string;
  details: { stripe_checkout_session: string | null; stripe_payment_intent: string | null };
}

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];

interface Props {
  reservationId: string;
  reservation: ReservationRow;
}

export default function PaymentHistoryModal({ reservationId, reservation }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/payment-history?rid=${reservationId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "failed");
        setItems((data?.items ?? []) as HistoryItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, reservationId]);

  const total = items.reduce((sum, it) => sum + (it.amount_jpy ?? 0), 0);
  const paymentState = computePaymentState(reservation);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-200"
        onClick={() => setOpen(true)}
      >
        入金履歴
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-[95vw] max-w-lg rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-200">入金履歴</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-slate-300">
                閉じる
              </Button>
            </div>
            <div className="mt-3">
              {loading ? (
                <p className="text-sm text-slate-400">読み込み中...</p>
              ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-400">履歴はありません。</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((it, idx) => (
                    <li key={idx} className="rounded border border-slate-800 bg-slate-950/50 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-200">{formatLocal(it.at)}</span>
                        <span className="text-sm font-semibold text-slate-100">¥{(it.amount_jpy ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        <span>方法: {labelMethod(it.method)}</span>
                        <span className="ml-2">担当: {it.source}</span>
                      </div>
                      {it.details?.stripe_payment_intent || it.details?.stripe_checkout_session ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {it.details?.stripe_payment_intent ? (
                            <span>PI: {mask(it.details.stripe_payment_intent)}</span>
                          ) : null}
                          {it.details?.stripe_checkout_session ? (
                            <span className="ml-2">CS: {mask(it.details.stripe_checkout_session)}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">予約合計</span>
                <span className="text-sm text-slate-100">¥{paymentState.total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">入金済み</span>
                <span className="text-sm text-slate-100">¥{paymentState.paid.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">残額</span>
                <span className="text-base font-semibold text-slate-100">¥{paymentState.remaining.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLocal(iso: string) {
  try {
    const dt = new Date(iso);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${d} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

function labelMethod(method: string) {
  switch (method) {
    case "cash":
      return "現金";
    case "card":
      return "カード";
    case "other":
      return "その他";
    default:
      return method ?? "不明";
  }
}

function mask(text: string | null) {
  if (!text) return "";
  if (text.length <= 8) return text;
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}