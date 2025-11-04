import Link from "next/link";
import { getActiveServices } from "@/server/services";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n/dictionaries";
import { formatCurrency, formatDuration } from "@/lib/format";
import { FALLBACK_SERVICES } from "@/lib/config";
import { getBusinessProfile } from "@/server/settings";
import BookingHero from "@/components/booking/hero";
import ServiceCard from "@/components/booking/service-card";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function BookingIndexPage({ params }: Props) {
  // Supabase未設定やAPI障害時でもページを表示するためフォールバックを用意
  let services: Array<{
    id: string;
    name: string;
    description?: string | null;
    duration_min: number;
    price_jpy: number;
  }> = [];
  try {
    const fetched = await getActiveServices();
    services = (fetched ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: (s as any).description ?? null,
      duration_min: s.duration_min,
      price_jpy: s.price_jpy,
    }));
  } catch {
    services = [];
  }
  if (!services || services.length === 0) {
    services = FALLBACK_SERVICES as any;
  }
  const resolved = await params;
  const locale = resolved.locale;
  const profile = await getBusinessProfile();
  const mapUrl = profile.map_url ?? undefined;
  const dict = getDictionary(locale);

  // 名前の文字種で日本語/英語を判定（カテゴリ列が無い前提）
  const isJapaneseName = (name: string) =>
    /[\u3040-\u30FF\u4E00-\u9FFF]/.test(name);
  const jpServices = services.filter((s) => isJapaneseName(s.name));
  const intlServices = services.filter((s) => !isJapaneseName(s.name));

  // セクション構成（enは国際向け→日本語、それ以外は日本語→国際向け）
  const sections: Array<{ title?: string; items: typeof services }> = [];
  if (jpServices.length === 0 && intlServices.length === 0) {
    sections.push({ items: services });
  } else if (locale === "en") {
    if (intlServices.length > 0)
      sections.push({
        title: dict.services.intlSectionTitle,
        items: intlServices,
      });
    if (jpServices.length > 0)
      sections.push({ title: dict.services.jpSectionTitle, items: jpServices });
  } else {
    if (jpServices.length > 0)
      sections.push({ title: dict.services.jpSectionTitle, items: jpServices });
    if (intlServices.length > 0)
      sections.push({
        title: dict.services.intlSectionTitle,
        items: intlServices,
      });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-14">
      <BookingHero
        title={dict.booking.hero.title}
        subtitle={dict.booking.hero.subtitle}
        ctaLabel={dict.services.title}
        eyebrow={dict.booking.steps.service}
        secondaryCtaLabel={dict.booking.hero.secondaryCta}
        secondaryCtaHref={mapUrl}
      />

      <Card className="border-slate-200 bg-white rounded-2xl shadow-md">
        <CardContent className="flex flex-col gap-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg space-y-1">
            <p className="text-sm font-semibold text-[var(--ink)]">
              アクセス &amp; 口コミ
            </p>
            <p>
              Google
              マップで店舗位置を確認し、最新のクチコミをご覧いただけます。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <a href={mapUrl} target="_blank" rel="noreferrer">
                Googleマップで見る
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={mapUrl} target="_blank" rel="noreferrer">
                クチコミを読む
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {sections.map((section, idx) => (
        <section
          key={idx}
          className="space-y-4"
          aria-label={section.title ?? dict.services.title}
        >
          {section.title && (
            <h2 className="text-xl md:text-2xl font-semibold text-[var(--ink)]">
              {section.title}
            </h2>
          )}
          <div id="services" className="grid gap-6 sm:grid-cols-2">
            {section.items.map((service) => (
              <ServiceCard
                key={service.id}
                locale={locale}
                dict={dict}
                service={service}
              />
            ))}
          </div>
        </section>
      ))}

      {/* 予約確認ページへの小リンクはヘッダー常設に移動したため削除 */}
    </div>
  );
}
