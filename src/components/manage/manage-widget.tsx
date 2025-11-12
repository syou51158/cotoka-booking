"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDisplay } from "@/lib/time";
import type { Dictionary } from "@/i18n/dictionaries";
import { XCircle, CheckCircle2, Loader2 } from "lucide-react";

type ManageDictionary = Dictionary["manage"];

interface ReservationPayload {
  id: string;
  code: string;
  status: string;
  amount_total_jpy?: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  start_at: string;
  end_at: string;
  service?: { name?: string | null; requires_prepayment?: boolean };
  staff?: { display_name?: string | null };
}

interface Props {
  locale: string;
  dict: ManageDictionary;
  initialCode?: string;
  initialContact?: string;
}

export default function ManageReservationWidget({
  locale,
  dict,
  initialCode,
  initialContact,
}: Props) {
  const [code, setCode] = useState(initialCode ?? "");
  const [contact, setContact] = useState(initialContact ?? "");
  const [reservation, setReservation] = useState<ReservationPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setReservation(null);
    try {
      const response = await fetch("/api/manage/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, contact }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? dict.notFound);
        return;
      }
      const data = (await response.json()) as ReservationPayload;
      setReservation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reservation) return;
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/manage/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: reservation.id,
          email: formData.get("email"),
          phone: formData.get("phone"),
          notes: formData.get("notes"),
          locale,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ?? "更新に失敗しました",
        );
        return;
      }
      const updated = await response.json();
      setReservation((prev) => (prev ? { ...prev, ...updated } : prev));
      setMessage(dict.successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!reservation) return;
    setLoading(true);
    setCanceling(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ?? "キャンセルに失敗しました",
        );
        return;
      }
      setReservation((prev) => (prev ? { ...prev, status: "canceled" } : prev));
      setMessage(dict.cancelSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : "キャンセルに失敗しました");
    } finally {
      setLoading(false);
      setCanceling(false);
    }
  }

  async function handlePrepay() {
    if (!reservation) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/reservations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rid: reservation.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ?? "決済の開始に失敗しました",
        );
        return;
      }
      const payload = await response.json();
      const url: string | undefined =
        (payload?.checkoutUrl as string | undefined) ??
        (payload?.data?.url as string | undefined) ??
        (payload?.url as string | undefined);
      if (url) {
        setStripeUrl(url);
        try {
          window.location.replace(url);
        } catch {
          try {
            window.open(url, "_blank", "noopener");
          } catch {}
        }
        setTimeout(() => {
          if (document.visibilityState === "visible") {
            setMessage(
              "Stripeへの遷移に時間がかかっています。下のリンクから進んでください。",
            );
          }
        }, 5000);
      } else {
        setError("決済URLの取得に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "決済の開始に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            {dict.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">{dict.codeLabel}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="COT-20240101-XXXX"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact">{dict.contactLabel}</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                placeholder="you@example.com / 090xxxx"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto"
              >
                {dict.search}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      {canceling ? (
        <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-4 text-amber-800" role="status" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <div className="text-sm font-medium">キャンセル処理中です。しばらくお待ちください…</div>
        </div>
      ) : null}
      {message ? (
        <div className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-4 text-emerald-700" role="status" aria-live="polite">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <div className="text-sm font-medium">{message}</div>
        </div>
      ) : null}

      {stripeUrl ? (
        <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p>
            Stripeへ遷移中です。進まない場合は
            <a
              href={stripeUrl}
              target="_blank"
              rel="noopener"
              className="font-semibold underline"
            >
              こちら
            </a>
            をクリックしてください。
          </p>
        </div>
      ) : null}

      {reservation ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {reservation.code}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            {reservation.status === "canceled" ? (
              <div className="flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 p-4 text-red-700">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">この予約はキャンセル済みです</p>
                    <p className="text-xs">再予約をご希望の場合は、メニュー一覧から新しくご予約ください。</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  <a href={`/${locale}#services`} aria-label="再予約へ">
                    再予約へ
                  </a>
                </Button>
              </div>
            ) : null}
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <span className="font-semibold text-slate-500">
                  {dict.statusLabel}
                </span>
                <p className="mt-1">
                  <span
                    className={`${
                      reservation.status === "canceled"
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : reservation.status === "confirmed"
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : reservation.status === "paid"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : reservation.status === "pending" || reservation.status === "unpaid"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                    } inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold`}
                    aria-label="予約ステータス"
                  >
                    {reservation.status === "canceled"
                      ? "キャンセル済み"
                      : reservation.status === "confirmed"
                        ? "予約確定"
                        : reservation.status === "paid"
                          ? "支払い済み"
                          : reservation.status === "pending"
                            ? "仮予約"
                            : reservation.status === "unpaid"
                              ? "未決済"
                              : reservation.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">日付</span>
                <p className="text-slate-900">
                  {formatDisplay(reservation.start_at)}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">メニュー</span>
                <p className="text-slate-900">
                  {reservation.service?.name ?? "未設定"}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">担当</span>
                <p className="text-slate-900">
                  {reservation.staff?.display_name ?? "未定"}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">金額</span>
                <p className="text-slate-900">
                  {typeof reservation.amount_total_jpy === "number"
                    ? `¥${reservation.amount_total_jpy.toLocaleString()}`
                    : "-"}
                </p>
              </div>
            </div>

            {/* 事前決済オプション */}
            {["pending", "unpaid", "confirmed"].includes(reservation.status) ? (
              <div className="rounded border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {dict.paymentTitle}
                    </p>
                    <p className="text-xs text-slate-500">{dict.paymentHelp}</p>
                  </div>
                  <Button onClick={handlePrepay} disabled={loading}>
                    {dict.paymentAction}
                  </Button>
                </div>
              </div>
            ) : null}

            <form
              onSubmit={handleUpdate}
              className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4"
            >
              <span className="text-sm font-semibold text-slate-700">
                {dict.updateTitle}
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="manage-email">{dict.contactInfo}</Label>
                  <Input
                    id="manage-email"
                    name="email"
                    type="email"
                    defaultValue={reservation.customer_email ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manage-phone">電話番号</Label>
                  <Input
                    id="manage-phone"
                    name="phone"
                    defaultValue={reservation.customer_phone ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="manage-notes">{dict.notesLabel}</Label>
                <Textarea
                  id="manage-notes"
                  name="notes"
                  rows={3}
                  defaultValue={reservation.notes ?? ""}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={loading}>
                  {dict.updateAction}
                </Button>
              </div>
            </form>

            {(["paid", "confirmed"] as string[]).includes(
              reservation.status,
            ) ? (
              <div className="rounded border border-red-100 bg-red-50 p-4" aria-busy={canceling}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      {dict.cancelTitle}
                    </p>
                    <p className="text-xs text-red-500">
                      キャンセル期限やポリシーを事前にご確認ください。
                    </p>
                  </div>
                  <Button onClick={handleCancel} variant="destructive" disabled={loading || canceling} aria-live="polite">
                    {canceling ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        キャンセル中…
                      </>
                    ) : (
                      <>{dict.cancelAction}</>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
