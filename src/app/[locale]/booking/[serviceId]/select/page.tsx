import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SlotSelector from "@/components/booking/slot-selector";
import { getDictionary } from "@/i18n/dictionaries";
import { formatCurrency, formatDuration } from "@/lib/format";
import { getServiceWithRelations } from "@/server/services";
import StickySummary from "@/components/booking/summary";
import SelectClient from "@/components/booking/select-client";
import SelectPageClient from "@/components/booking/select-page-client";

interface Props {
  params: Promise<{ locale: string; serviceId: string }>;
}

export default async function SelectPage({ params }: Props) {
  const resolved = await params;
  const { locale, serviceId } = resolved;
  const service = await getServiceWithRelations(serviceId);
  if (!service) {
    notFound();
  }

  if (service.staff.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
        <Button asChild variant="link" className="px-0">
          <Link href={`/${locale}/booking/${service.id}`}>← 戻る</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900">
              スタッフ情報が必要です
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              このメニューに紐づくスタッフがまだ登録されていません。Supabaseの{" "}
              <code>staff</code> と <code>staff_services</code>{" "}
              テーブルを確認してください。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dict = getDictionary(locale);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-14 pb-24 lg:pb-0">
      <Button asChild variant="link" className="px-0">
        <Link href={`/${locale}/booking/${service.id}`}>
          ← {dict.common.back}
        </Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl font-semibold text-[var(--ink)]">
          {dict.booking.steps.date}
        </h1>
        <p className="text-sm text-slate-600">
          {service.name} ・ {dict.services.duration}:{" "}
          {formatDuration(service.duration_min)} ・ {dict.services.price}:{" "}
          {formatCurrency(service.price_jpy)}
        </p>
      </div>

      <SelectPageClient
        locale={locale}
        dict={dict}
        service={{
          id: service.id,
          name: service.name,
          duration_min: service.duration_min,
          buffer_before_min: service.buffer_before_min,
          buffer_after_min: service.buffer_after_min,
          price_jpy: service.price_jpy,
        }}
        staff={service.staff.map((staff) => ({
          id: staff.id,
          name: staff.display_name,
          color: staff.color ?? "#64748B",
        }))}
      />
    </div>
  );
}
