"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/lib/toast";
import {
    cancelReservationAction,
    updateReservationNotesAction,
} from "@/app/admin/(protected)/actions";
import SettlePaymentForm from "@/components/admin/settle-payment-form";
import PaymentHistoryModal from "@/components/admin/payment-history-modal";
import EmailHistoryModal from "@/components/admin/email-history-modal";
import { ResendEmailButton } from "@/components/admin/resend-email-button";
import { computePaymentState } from "@/lib/payments";
import { env } from "@/lib/env";

// Define a type compatible with what page.tsx provides
type Reservation = {
    id: string;
    code: string;
    status: string;
    start_at: string;
    end_at: string;
    amount_total_jpy: number;
    paid_amount_jpy: number;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    notes: string | null;
    pending_expires_at: string | null;
    service: { name: string } | null | undefined;
    staff: { display_name: string } | null | undefined;
    payment_option?: string | null;
    [key: string]: any; // Allow other properties
};

const STATUS_LABEL: Record<string, string> = {
    pending: "未決済",
    unpaid: "未支払い",
    processing: "処理中",
    paid: "支払い済み",
    confirmed: "確定",
    canceled: "キャンセル",
    no_show: "未来店",
    refunded: "返金済み",
};

export default function ReservationDetails({
    reservation,
}: {
    reservation: Reservation;
}) {
    const [isPending, startTransition] = useTransition();

    const handleUpdateNotes = async (formData: FormData) => {
        startTransition(async () => {
            try {
                await updateReservationNotesAction(formData);
                showToast({ title: "メモを保存しました", variant: "success" });
            } catch (error: any) {
                showToast({
                    title: "エラー",
                    description: error.message || "保存に失敗しました",
                    variant: "error",
                });
            }
        });
    };

    const handleCancel = async (formData: FormData) => {
        if (!confirm("本当にキャンセルしますか？")) return;
        startTransition(async () => {
            try {
                await cancelReservationAction(formData);
                showToast({ title: "予約をキャンセルしました", variant: "success" });
            } catch (error: any) {
                showToast({
                    title: "エラー",
                    description: error.message || "キャンセルに失敗しました",
                    variant: "error",
                });
            }
        });
    };

    return (
        <details className="rounded-lg border border-slate-800 bg-slate-950/40">
            <summary className="flex cursor-pointer flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-white">
                            {reservation.service?.name ?? "メニュー未設定"}
                        </h2>
                        <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                            {STATUS_LABEL[reservation.status] ?? reservation.status}
                        </Badge>
                        {reservation.status === "pending" &&
                            reservation.pending_expires_at ? (
                            <Badge className="bg-amber-700/70 text-amber-100">
                                期限{" "}
                                {format(new Date(reservation.pending_expires_at), "HH:mm")}
                            </Badge>
                        ) : null}
                        {/* Payment Status Badge */}
                        {(() => {
                            const state = computePaymentState(reservation);
                            if (state.statusTag === "canceled") {
                                return (
                                    <Badge className="bg-slate-700/60 text-slate-300">
                                        キャンセル
                                    </Badge>
                                );
                            }
                            if (state.statusTag === "unpaid") {
                                return (
                                    <Badge className="bg-amber-700/60 text-amber-100">
                                        未収
                                    </Badge>
                                );
                            }
                            if (state.statusTag === "partial") {
                                return (
                                    <Badge className="bg-blue-700/60 text-blue-100">
                                        一部入金
                                    </Badge>
                                );
                            }
                            if (state.statusTag === "paid") {
                                return (
                                    <Badge className="bg-emerald-700/70 text-emerald-100">
                                        支払い済み
                                    </Badge>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <p className="text-sm text-slate-400">
                        {format(new Date(reservation.start_at), "yyyy/MM/dd HH:mm")} -{" "}
                        {format(new Date(reservation.end_at), "HH:mm")} ・{" "}
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
                            {STATUS_LABEL[reservation.status] ?? reservation.status}
                        </p>
                        {reservation.status === "pending" &&
                            reservation.pending_expires_at ? (
                            <p className="text-xs text-amber-300">
                                支払い期限:{" "}
                                {format(
                                    new Date(reservation.pending_expires_at),
                                    "yyyy/MM/dd HH:mm"
                                )}
                            </p>
                        ) : null}
                    </div>
                </div>

                <form action={handleUpdateNotes} className="space-y-2">
                    <input type="hidden" name="reservationId" value={reservation.id} />
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
                        disabled={isPending}
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            type="submit"
                            size="sm"
                            className="border-slate-700 bg-slate-800 text-slate-100"
                            disabled={isPending}
                        >
                            メモを保存
                        </Button>
                        <PaymentHistoryModal
                            reservationId={reservation.id}
                            reservation={reservation as any}
                        />
                        <EmailHistoryModal reservationId={reservation.id} />
                        <ResendEmailButton
                            reservationId={reservation.id}
                            customerEmail={reservation.customer_email ?? ""}
                        />
                    </div>
                </form>

                {(() => {
                    const state = computePaymentState(reservation);
                    const canSettle =
                        reservation.status !== "canceled" && state.remaining > 0;
                    if (!canSettle) return null;

                    return (
                        <SettlePaymentForm
                            reservationId={reservation.id}
                            remaining={state.remaining}
                            paymentOption={reservation.payment_option ?? null}
                        />
                    );
                })()}

                {reservation.status !== "canceled" ? (
                    <form action={handleCancel} className="flex justify-end">
                        <input type="hidden" name="reservationId" value={reservation.id} />
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                            disabled={isPending}
                        >
                            キャンセル
                        </Button>
                    </form>
                ) : null}
            </div>
        </details>
    );
}
