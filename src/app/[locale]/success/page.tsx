import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/i18n/dictionaries";
import {
  SALON_LOCATION_TEXT,
  SITE_NAME,
  SITE_URL,
  TIMEZONE,
  SALON_MAP_URL,
} from "@/lib/config";
import { formatDisplay } from "@/lib/time";
import { formatCurrency } from "@/lib/format";
import { getReservationById } from "@/server/reservations";
import { getServiceById } from "@/server/services";
import PaymentConfirm from "@/components/success/payment-confirm";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const resolved = await params;
  const locale = resolved.locale;
  const dict = getDictionary(locale);
  const sp = searchParams ? await searchParams : undefined;
  const reservationId = typeof sp?.rid === "string" ? sp.rid : undefined;
  const csId = typeof sp?.cs_id === "string" ? sp.cs_id : undefined;
  const reservation = reservationId
    ? await getReservationById(reservationId)
    : null;
  const service =
    reservation && reservation.service_id
      ? await getServiceById(reservation.service_id)
      : null;

  const icsDownloadHref = reservation
    ? `/api/ics?rid=${encodeURIComponent(reservation.id)}`
    : null;
  const googleCalendarHref = reservation
    ? (() => {
        const title = `${SITE_NAME} - ${service?.name ?? "ご予約"}`;
        const details = [
          `${reservation.customer_name} 様`,
          "Cotoka Relax & Beauty SPA のご予約が確定しました。",
          SALON_LOCATION_TEXT,
          SITE_URL,
        ].join("\n");
        const startUtc = new Date(reservation.start_at ?? new Date());
        const endUtc = new Date(reservation.end_at ?? new Date());
        const startGoogle = formatInTimeZone(
          startUtc,
          "UTC",
          "yyyyMMdd'T'HHmmss'Z'",
        );
        const endGoogle = formatInTimeZone(
          endUtc,
          "UTC",
          "yyyyMMdd'T'HHmmss'Z'",
        );
        const googleUrl = new URL(
          "https://calendar.google.com/calendar/render",
        );
        googleUrl.searchParams.set("action", "TEMPLATE");
        googleUrl.searchParams.set("text", title);
        googleUrl.searchParams.set("dates", `${startGoogle}/${endGoogle}`);
        googleUrl.searchParams.set("details", details);
        googleUrl.searchParams.set("location", SALON_LOCATION_TEXT);
        return googleUrl.toString();
      })()
    : null;

  const showPaymentHelp =
    reservation && !csId && ["unpaid", "confirmed", "pending"].includes(reservation.status as any);
  const showOnsitePaymentNotice =
    !!reservation &&
    !csId &&
    (((reservation as any).payment_option ?? "pay_in_store") === "pay_in_store") &&
    (["confirmed", "unpaid", "pending"].includes(reservation.status as any));

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">
            ありがとうございます
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-slate-600">
          <p>{dict.status.success}</p>
          <p>
            ご予約内容は登録いただいたメールアドレスへ送信されます。届かない場合は迷惑メールをご確認のうえ、お電話でお問い合わせください。
          </p>
          {reservation && csId ? (
            <PaymentConfirm rid={reservation.id} csId={csId} />
          ) : null}

          {reservation ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                ご予約情報
              </p>
              <p>
                <span className="font-semibold">メニュー:</span>{" "}
                {service?.name ?? "未設定"}
              </p>
              <p>
                <span className="font-semibold">日時:</span>{" "}
                {formatDisplay(reservation.start_at)}
              </p>
              <p>
                <span className="font-semibold">終了予定:</span>{" "}
                {formatDisplay(reservation.end_at)}
              </p>
              <p>
                <span className="font-semibold">予約コード:</span>{" "}
                {reservation.code}
              </p>
              {showOnsitePaymentNotice ? (
                <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-slate-800">
                  <p>
                    お支払いはご来店時にお願いします（現金/カード）。合計：
                    {typeof reservation.amount_total_jpy === "number"
                      ? formatCurrency(reservation.amount_total_jpy)
                      : "-"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {showPaymentHelp ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">お支払いについて</p>
              <p>
                来店時の現金またはカードでお支払い可能です。オンライン事前決済をご希望の場合は、本人確認ページから手続きできます。
              </p>
              <div className="mt-3">
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link href={`/${locale}/manage`}>本人確認ページを開く</Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              ご来店案内
            </p>
            <p>{SALON_LOCATION_TEXT}</p>
            <p>
              烏丸御池駅の改札を出てエレベーターで7階へ。エレベーターを降りて右後ろ側の704号室です。
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <a href={SALON_MAP_URL} target="_blank" rel="noreferrer">Googleマップで見る</a>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={SALON_MAP_URL} target="_blank" rel="noreferrer">経路案内を開く</a>
              </Button>
            </div>
          </div>

          {reservation && icsDownloadHref && googleCalendarHref ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full">
                <a href={icsDownloadHref}>.ics をダウンロード</a>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <a href={googleCalendarHref} target="_blank" rel="noreferrer">
                  Googleカレンダーに追加
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href={icsDownloadHref}>Appleカレンダーに追加</a>
              </Button>
            </div>
          ) : null}

          <p className="text-xs text-slate-500">
            すべての時刻は {TIMEZONE} で表示しています。
          </p>

          <Button asChild className="w-full sm:w-auto">
            <Link href={`/${locale}/booking`}>別のメニューを見る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
