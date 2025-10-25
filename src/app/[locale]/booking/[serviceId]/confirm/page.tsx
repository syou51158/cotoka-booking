import Link from "next/link";
import { notFound } from "next/navigation";
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
  const staffId =
    typeof sp?.staffId === "string" ? (sp?.staffId as string) : undefined;
  const start =
    typeof sp?.start === "string"
      ? decodeURIComponent(sp.start as string)
      : undefined;
  const end =
    typeof sp?.end === "string"
      ? decodeURIComponent(sp.end as string)
      : undefined;

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
            <Button asChild className="w-full sm:w-auto bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110">
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
          {service.name} ・ {dict.services.duration}: {durationLabel} ・ {dict.services.price}: {formatCurrency(service.price_jpy)}
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
