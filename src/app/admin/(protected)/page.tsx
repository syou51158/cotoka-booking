import Link from "next/link";
import { addDays, endOfDay, format, startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getActiveServices } from "@/server/services";
import { getAdminReservations, getStaffDirectory } from "@/server/admin";
import {
  cancelReservationAction,
  updateReservationNotesAction,
  settleReservationAction,
} from "./actions";
import Toaster from "@/components/ui/toaster";
import SettlePaymentForm from "@/components/admin/settle-payment-form";
import { getPaymentSummaries } from "@/server/payments";
import PaymentHistoryModal from "@/components/admin/payment-history-modal";
import { env } from "@/lib/env";
import { computePaymentState } from "@/lib/payments";

const STATUS_LABEL = {
  pending: "未決済",
  unpaid: "未支払い",
  processing: "処理中",
  paid: "支払い済み",
  confirmed: "確定",
  canceled: "キャンセル",
  no_show: "未来店",
  refunded: "返金済み",
} as const;

const RANGE_OPTIONS = {
  today: {
    label: "今日",
    resolve: () => {
      const now = new Date();
      return { from: startOfDay(now), to: endOfDay(now) };
    },
  },
  next7: {
    label: "今後7日",
    resolve: () => {
      const now = new Date();
      return { from: startOfDay(now), to: endOfDay(addDays(now, 7)) };
    },
  },
  next30: {
    label: "今後30日",
    resolve: () => {
      const now = new Date();
      return { from: startOfDay(now), to: endOfDay(addDays(now, 30)) };
    },
  },
} satisfies Record<
  string,
  { label: string; resolve: () => { from: Date; to: Date } }
>;

type RangeKey = keyof typeof RANGE_OPTIONS;
type StatusKey = keyof typeof STATUS_LABEL;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rangeParam =
    typeof searchParams?.range === "string" ? searchParams.range : "today";
  const staffParam =
    typeof searchParams?.staff === "string" ? searchParams.staff : "all";
  const serviceParam =
    typeof searchParams?.service === "string" ? searchParams.service : "all";
  const statusParam =
    typeof searchParams?.status === "string" ? searchParams.status : "all";
  const payParam =
    typeof searchParams?.pay === "string" ? searchParams.pay : "all";

  const rangeKey: RangeKey =
    rangeParam && rangeParam in RANGE_OPTIONS
      ? (rangeParam as RangeKey)
      : "today";
  const statusFilter: StatusKey | undefined =
    statusParam && statusParam in STATUS_LABEL
      ? (statusParam as StatusKey)
      : undefined;
  const range = RANGE_OPTIONS[rangeKey];
  const { from, to } = range.resolve();

  const [reservations, staff, services, todayReservations, weekReservations] = await Promise.all([
    getAdminReservations({
      from: from.toISOString(),
      to: to.toISOString(),
      staffId: staffParam !== "all" ? staffParam : undefined,
      serviceId: serviceParam !== "all" ? serviceParam : undefined,
      status: statusParam !== "all" ? statusFilter : undefined,
    }),
    getStaffDirectory(),
    getActiveServices(),
    // 今日のサマリー用
    (async () => {
      const t = RANGE_OPTIONS.today.resolve();
      return getAdminReservations({
        from: t.from.toISOString(),
        to: t.to.toISOString(),
        staffId: staffParam !== "all" ? staffParam : undefined,
        serviceId: serviceParam !== "all" ? serviceParam : undefined,
        status: statusParam !== "all" ? statusFilter : undefined,
      });
    })(),
    // 今週のサマリー用（週の開始は月曜）
    (async () => {
      const now = new Date();
      const wFrom = startOfWeek(now, { weekStartsOn: 1 });
      const wTo = endOfWeek(now, { weekStartsOn: 1 });
      return getAdminReservations({
        from: wFrom.toISOString(),
        to: wTo.toISOString(),
        staffId: staffParam !== "all" ? staffParam : undefined,
        serviceId: serviceParam !== "all" ? serviceParam : undefined,
        status: statusParam !== "all" ? statusFilter : undefined,
      });
    })(),
  ]);

  // SSOT: computePaymentStateを使用した支払い状態計算
  const filteredReservations = reservations.filter((r) => {
    const state = computePaymentState(r);
    if (payParam === "unpaid") return state.statusTag === "unpaid";
    if (payParam === "partial") return state.statusTag === "partial";
    if (payParam === "paid") return state.statusTag === "paid";
    if (payParam === "canceled") return state.statusTag === "canceled";
    return true;
  });
  const statusOptions = Object.entries(STATUS_LABEL);

  // サマリー集計（SSOT）
  const summarize = (items: typeof reservations) => {
    const count = items.length;
    const paidTotal = items.reduce((sum, r) => sum + computePaymentState(r).paid, 0);
    return { count, paidTotal };
  };
  const todaySummary = summarize(todayReservations);
  const weekSummary = summarize(weekReservations);

  // CSV エクスポート URL（現在のフィルタを引き継ぐ）
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    staff: staffParam,
    service: serviceParam,
    status: statusParam,
    pay: payParam,
  });
  const exportHref = `/api/admin/export?${params.toString()}`;

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-semibold">予約台帳</h1>
        <p className="text-sm text-slate-400">
          当日の予約状況を一覧表示。必要に応じてステータス変更やキャンセル処理を行えます。
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-base text-slate-200">今日のサマリー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>予約件数</span>
              <span className="font-semibold text-slate-100">{todaySummary.count}件</span>
            </div>
            <div className="flex items-center justify-between">
              <span>売上（入金済）</span>
              <span className="font-semibold text-slate-100">¥{todaySummary.paidTotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-base text-slate-200">今週のサマリー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>予約件数</span>
              <span className="font-semibold text-slate-100">{weekSummary.count}件</span>
            </div>
            <div className="flex items-center justify-between">
              <span>売上（入金済）</span>
              <span className="font-semibold text-slate-100">¥{weekSummary.paidTotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">
            クイックフィルタ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-5" method="get">
            <div className="flex flex-col gap-1 text-xs text-slate-300">
              <label htmlFor="range" className="font-semibold text-slate-200">
                期間
              </label>
              <select
                id="range"
                name="range"
                defaultValue={rangeKey}
                className="h-9 rounded border border-slate-700 bg-slate-900/80 px-2 text-sm text-slate-100"
              >
                {Object.entries(RANGE_OPTIONS).map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-300">
              <label htmlFor="service" className="font-semibold text-slate-200">
                サービス
              </label>
              <select
                id="service"
                name="service"
                defaultValue={serviceParam}
                className="h-9 rounded border border-slate-700 bg-slate-900/80 px-2 text-sm text-slate-100"
              >
                <option value="all">すべて</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-300">
              <label htmlFor="staff" className="font-semibold text-slate-200">
                スタッフ
              </label>
              <select
                id="staff"
                name="staff"
                defaultValue={staffParam}
                className="h-9 rounded border border-slate-700 bg-slate-900/80 px-2 text-sm text-slate-100"
              >
                <option value="all">すべて</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-300">
              <label htmlFor="status" className="font-semibold text-slate-200">
                ステータス
              </label>
              <select
                id="status"
                name="status"
                defaultValue={statusFilter ?? "all"}
                className="h-9 rounded border border-slate-700 bg-slate-900/80 px-2 text-sm text-slate-100"
              >
                <option value="all">すべて</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 支払い状況フィルタ */}
            <div className="flex flex-col gap-1 text-xs text-slate-300">
              <label htmlFor="pay" className="font-semibold text-slate-200">
                支払い状況
              </label>
              <select
                id="pay"
                name="pay"
                defaultValue={payParam}
                className="h-9 rounded border border-slate-700 bg-slate-900/80 px-2 text-sm text-slate-100"
              >
                <option value="all">すべて</option>
                <option value="unpaid">未収のみ</option>
                <option value="partial">一部入金のみ</option>
                <option value="paid">支払い済みのみ</option>
                <option value="canceled">キャンセル済みのみ</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                variant="secondary"
                className="w-full border border-slate-700 text-slate-200"
              >
                適用
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-slate-400"
                asChild
              >
                <Link href="/admin">リセット</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {reservations.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="py-10 text-center text-sm text-slate-400">
            該当する予約はありません。
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base text-slate-200">予約一覧</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href={exportHref}>CSVエクスポート</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {filteredReservations.map((reservation) => (
                <details
                  key={reservation.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/40"
                >
                  <summary className="flex cursor-pointer flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text白 text-white">
                          {reservation.service?.name ?? "メニュー未設定"}
                        </h2>
                        <Badge
                          variant="secondary"
                          className="bg-slate-800 text-slate-200"
                        >
                          {STATUS_LABEL[reservation.status] ?? reservation.status}
                        </Badge>
                        {/* 入金ステータスバッジ（SSOT） */}
                        {(() => {
                          const state = computePaymentState(reservation);
                          if (state.statusTag === "canceled") {
                            return (
                              <Badge className="bg-slate-700/60 text-slate-300">キャンセル</Badge>
                            );
                          }
                          if (state.statusTag === "unpaid") {
                            return (
                              <Badge className="bg-amber-700/60 text-amber-100">未収</Badge>
                            );
                          }
                          if (state.statusTag === "partial") {
                            return (
                              <Badge className="bg-blue-700/60 text-blue-100">一部入金</Badge>
                            );
                          }
                          if (state.statusTag === "paid") {
                            return (
                              <Badge className="bg-emerald-700/70 text-emerald-100">支払い済み</Badge>
                            );
                          }
                          return null;
                        })()}
                        {/* DEV-only: SSOTミニテキスト */}
                        {env.ALLOW_DEV_MOCKS === "true" && env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true" ? (
                          (() => {
                            const state = computePaymentState(reservation);
                            return (
                              <span className="text-[10px] text-slate-400">{state.statusTag} / paid={state.paid} / remain={state.remaining}</span>
                            );
                          })()
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-400">
                        {format(
                          new Date(reservation.start_at),
                          "yyyy/MM/dd HH:mm",
                        )}{" "}
                        - {format(new Date(reservation.end_at), "HH:mm")} ・{" "}
                        {reservation.staff?.display_name ?? "担当なし"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {reservation.customer_name} /{" "}
                        {reservation.customer_email ?? "メール未登録"} /{" "}
                        {reservation.customer_phone ?? "電話未登録"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">
                        ¥{reservation.amount_total_jpy.toLocaleString()}
                      </span>
                      {/* 残額列（SSOT） */}
                      <span className="rounded border border-slate-800 px-3 py-1 text-xs text-slate-300">
                        残額 ¥{computePaymentState(reservation).remaining.toLocaleString()}
                      </span>
                      <span className="rounded border border-slate-800 px-3 py-1 text-xs text-slate-300">
                        クリックで詳細
                      </span>
                    </div>
                  </summary>
                  <div className="space-y-4 border-t border-slate-800 bg-slate-950/70 px-4 py-4 text-sm text-slate-200">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          予約番号
                        </p>
                        <p className="font-semibold">{reservation.code}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          現在ステータス
                        </p>
                        <p className="font-semibold">
                          {STATUS_LABEL[reservation.status] ??
                            reservation.status}
                        </p>
                      </div>
                    </div>

                    <form
                      action={updateReservationNotesAction}
                      className="space-y-2"
                    >
                      <input
                        type="hidden"
                        name="reservationId"
                        value={reservation.id}
                      />
                      <label
                        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        htmlFor={`notes-${reservation.id}`}
                      >
                        メモ
                      </label>
                      <Textarea
                        id={`notes-${reservation.id}`}
                        name="notes"
                        rows={3}
                        defaultValue={reservation.notes ?? ""}
                        className="bg-slate-900/80 text-sm text-slate-100"
                        placeholder="来店時の注意事項など"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          className="border-slate-700 bg-slate-800 text-slate-100"
                        >
                          メモを保存
                        </Button>
                        <PaymentHistoryModal reservationId={reservation.id} reservation={reservation} />
                      </div>
                    </form>

                    {(() => {
                      const state = computePaymentState(reservation);
                      const canSettle = reservation.status !== "canceled" && state.remaining > 0;
                      if (!canSettle) return null;

                      return (
                        <SettlePaymentForm
                          reservationId={reservation.id}
                          remaining={state.remaining}
                          paymentOption={(reservation as any).payment_option ?? null}
                        />
                      );
                    })()}

                    {reservation.status !== "canceled" ? (
                      <form
                        action={cancelReservationAction}
                        className="flex justify-end"
                      >
                        <input
                          type="hidden"
                          name="reservationId"
                          value={reservation.id}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                        >
                          キャンセル
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
