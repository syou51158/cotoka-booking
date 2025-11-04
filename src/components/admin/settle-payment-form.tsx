"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { settleReservationAction } from "@/app/admin/(protected)/actions";

interface Props {
  reservationId: string;
  remaining: number;
  defaultMethod?: string;
  paymentOption?: string | null;
}

export default function SettlePaymentForm({
  reservationId,
  remaining,
  defaultMethod = "cash",
  paymentOption,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isDisabled = remaining <= 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("reservationId", reservationId);

    startTransition(async () => {
      try {
        await settleReservationAction(fd);
        showToast({ title: "支払いを記録しました", variant: "success" });
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "送信に失敗しました";
        showToast({
          title: "支払いエラー",
          description: message,
          variant: "error",
        });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label
            className="text-xs font-semibold uppercase tracking-wide text-slate-400"
            htmlFor={`amount-${reservationId}`}
          >
            金額 (JPY)
          </label>
          <input
            id={`amount-${reservationId}`}
            name="amount"
            type="number"
            min={1}
            max={remaining}
            defaultValue={remaining}
            required
            disabled={isDisabled || isPending}
            className="w-full rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-sm text-slate-100 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            className="text-xs font-semibold uppercase tracking-wide text-slate-400"
            htmlFor={`method-${reservationId}`}
          >
            決済方法
          </label>
          <select
            id={`method-${reservationId}`}
            name="method"
            defaultValue={defaultMethod}
            disabled={isDisabled || isPending}
            className="w-full rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-sm text-slate-100 disabled:opacity-60"
          >
            <option value="cash">現金</option>
            <option value="card">カード</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div className="flex items-end justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={isDisabled || isPending}
            className="border-slate-700 bg-emerald-700/80 text-slate-100 disabled:bg-slate-700 disabled:text-slate-300"
          >
            支払いを記録
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        支払いオプション: {paymentOption ?? "未設定"}
      </p>
      {isDisabled ? (
        <p className="text-xs text-slate-400">
          残額はありません。追加の入金は不要です。
        </p>
      ) : (
        <p className="text-xs text-red-400">
          金額は 1 以上、残額以内で入力してください。
        </p>
      )}
    </form>
  );
}
