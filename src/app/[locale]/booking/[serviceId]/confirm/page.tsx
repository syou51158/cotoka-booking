import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/config";
import { getReservationById } from "@/server/reservations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmReservationForm from "@/components/booking/confirm-reservation-form";
import StickySummary from "@/components/booking/summary";
import { getDictionary } from "@/i18n/dictionaries";
import { formatCurrency, formatDuration } from "@/lib/format";
import { formatDisplay } from "@/lib/time";
import { getServiceWithRelations } from "@/server/services";

interface Props {
  params: Promise<{ locale: string; serviceId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConfirmPage({ params, searchParams }: Props) {
  const resolved = await params;
  const { locale, serviceId } = resolved;
  const service = await getServiceWithRelations(serviceId);
  if (!service) {
    notFound();
  }

  const sp = searchParams ? await searchParams : undefined;
  const rid = typeof sp?.rid === "string" ? (sp?.rid as string) : undefined;
  const staffIdParam =
    typeof sp?.staffId === "string" ? (sp?.staffId as string) : undefined;
  const startParam =
    typeof sp?.start === "string"
      ? decodeURIComponent(sp.start as string)
      : undefined;
  const endParam =
    typeof sp?.end === "string"
      ? decodeURIComponent(sp.end as string)
      : undefined;

  // rid が指定されている場合は必ず予約を再取得し、状態を検証
  let staffId = staffIdParam;
  let start = startParam;
  let end = endParam;
  if (rid) {
    const reservation = await getReservationById(rid);
    if (!reservation || reservation.service_id !== service.id) {
      // サービス不一致や存在しない場合は選び直し導線
      const dict = getDictionary(locale);
      return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-14">
          <Button asChild variant="link" className="px-0">
            <Link href={`/${locale}/booking/${service.id}/select`}>
              ← {dict.common.back}
            </Link>
          </Button>
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-[var(--ink)]">
                枠を選び直してください
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>担当スタッフと日時を選択してから確認画面に進んでください。</p>
              <Button
                asChild
                className="w-full sm:w-auto bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
              >
                <Link href={`/${locale}/booking/${service.id}/select`}>
                  空き枠を検索する
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // 状態バリデーション
    const now = Date.now();
    const pendingUntil = reservation.pending_expires_at
      ? new Date(reservation.pending_expires_at).getTime()
      : null;

    if (reservation.status !== "pending") {
      // 既に確定/キャンセル
      return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-14">
          <Button asChild variant="link" className="px-0">
            <Link href={`/${locale}/booking`}>← メニューに戻る</Link>
          </Button>
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-[var(--ink)]">
                この予約はすでに確定済みかキャンセル済みです
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>新しく予約してください。</p>
              <Button
                asChild
                className="w-full sm:w-auto bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
              >
                <Link href={`/${locale}/booking`}>メニューに戻る</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!pendingUntil || pendingUntil <= now) {
      // 時間切れ
      return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-14">
          <Button asChild variant="link" className="px-0">
            <Link href={`/${locale}/booking`}>← メニューに戻る</Link>
          </Button>
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-[var(--ink)]">
                ご予約の保留が時間切れになりました
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                もう一度メニューと日時をお選びください。お支払いが完了していないため、枠は自動的に解放されました。
              </p>
              <Button
                asChild
                className="w-full sm:w-auto bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
              >
                <Link href={`/${locale}/booking`}>メニューに戻る</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // 有効な保留: 予約からスタッフ/時間を復元（サーバ値を優先）
    staffId = (reservation.staff_id ?? undefined) as string | undefined;
    start = formatInTimeZone(
      new Date(reservation.start_at),
      TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
    end = formatInTimeZone(
      new Date(reservation.end_at),
      TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
  }

  const staff = service.staff.find((member) => member.id === staffId);

  if (!staff || !start) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-14">
        <Button asChild variant="link" className="px-0">
          <Link href={`/${locale}/booking/${service.id}/select`}>← 戻る</Link>
        </Button>
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[var(--ink)]">
              枠を選び直してください
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>担当スタッフと日時を選択してから確認画面に進んでください。</p>
            <Button
              asChild
              className="w-full sm:w-auto bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
            >
              <Link href={`/${locale}/booking/${service.id}/select`}>
                空き枠を検索する
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dict = getDictionary(locale);
  const durationLabel =
    locale === "ja"
      ? `${service.duration_min}分`
      : locale === "zh"
        ? `${service.duration_min}分钟`
        : formatDuration(service.duration_min);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-14 pb-24 lg:pb-0">
      <Button asChild variant="link" className="px-0">
        <Link href={`/${locale}/booking/${service.id}/select`}>
          ← {dict.common.back}
        </Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl font-semibold text-[var(--ink)]">
          {dict.booking.steps.customer} & {dict.booking.steps.payment}
        </h1>
        <p className="text-sm text-slate-600">
          {service.name} ・ {dict.services.duration}: {durationLabel} ・{" "}
          {dict.services.price}: {formatCurrency(service.price_jpy)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[var(--ink)]">
              {dict.confirm.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConfirmReservationForm
              service={service}
              staff={staff}
              slot={{ start, end }}
              locale={locale}
              dict={dict}
              rid={rid}
            />
          </CardContent>
        </Card>

        <div className="hidden lg:block">
          <div className="md:sticky md:top-24">
            <StickySummary
              dict={dict}
              serviceName={service.name}
              priceJpy={service.price_jpy}
              durationLabel={durationLabel}
              extraRows={[
                {
                  label: dict.booking.summary.staff,
                  value: staff.display_name,
                },
                {
                  label: dict.booking.summary.time,
                  value: formatDisplay(start),
                },
              ]}
              durationNote={{
                treatmentMin:
                  service.duration_min -
                  (service.buffer_before_min + service.buffer_after_min),
                bufferBeforeMin: service.buffer_before_min,
                bufferAfterMin: service.buffer_after_min,
              }}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden sticky bottom-0 z-10">
        <StickySummary
          dict={dict}
          serviceName={service.name}
          priceJpy={service.price_jpy}
          durationLabel={durationLabel}
          extraRows={[
            { label: dict.booking.summary.staff, value: staff.display_name },
            { label: dict.booking.summary.time, value: formatDisplay(start) },
          ]}
          durationNote={{
            treatmentMin:
              service.duration_min -
              (service.buffer_before_min + service.buffer_after_min),
            bufferBeforeMin: service.buffer_before_min,
            bufferAfterMin: service.buffer_after_min,
          }}
        />
      </div>
    </div>
  );
}
