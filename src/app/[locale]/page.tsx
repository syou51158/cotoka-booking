import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getActiveServices } from "@/server/services";
import { formatCurrency, formatDuration } from "@/lib/format";
import {
  DEFAULT_LOCALE,
  FALLBACK_SERVICES,
  SALON_NAME,
  SALON_MAP_URL,
  SALON_OPENING_HOURS,
  SALON_ADDRESS,
  CANCEL_POLICY_TEXT,
} from "@/lib/config";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function TopPage({ params }: Props) {
  const resolved = await params;
  const locale = resolved.locale || DEFAULT_LOCALE;

  // メニュー&価格: services API を優先、空なら config のフォールバック
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
      description: s.description ?? null,
      duration_min: s.duration_min,
      price_jpy: s.price_jpy,
    }));
  } catch {
    services = [];
  }
  if (!services || services.length === 0) {
    services = FALLBACK_SERVICES as any;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10">
      {/* Hero */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">{SALON_NAME}</h1>
          <p className="text-sm text-slate-600">
            烏丸御池駅直結・704号室。エレベーターを降りて右後ろへお進みください。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:w-auto text-base py-6">
            <Link href={`/${locale}/booking`}>Web予約する</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto text-base py-6">
            <a href={SALON_MAP_URL} target="_blank" rel="noopener">
              地図で確認
            </a>
          </Button>
        </div>
      </section>

      {/* メニュー&価格 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">メニュー & 価格</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle className="text-lg">{service.name}</CardTitle>
                {service.description ? (
                  <CardDescription>{service.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">施術時間</span>
                  <span className="font-medium text-slate-900">
                    {formatDuration(service.duration_min)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">税込価格</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(service.price_jpy)}
                  </span>
                </div>
                <Button asChild className="mt-2 w-full">
                  <Link href={`/${locale}/booking/${service.id}`}>このメニューで予約</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 営業時間 */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">営業時間</h2>
        <Card>
          <CardContent className="py-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
              {SALON_OPENING_HOURS.map((h) => (
                <div key={h.day} className="flex items-center justify-between">
                  <span className="text-slate-500">{h.day}</span>
                  <span className="text-slate-900">{h.opens} – {h.closes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* アクセス */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">アクセス</h2>
        <Card>
          <CardContent className="py-5 space-y-2 text-sm text-slate-700">
            <p>
              住所：{SALON_ADDRESS.streetAddress}（{SALON_ADDRESS.addressLocality}、{SALON_ADDRESS.addressRegion}）
            </p>
            <p>最寄り：烏丸御池駅 直結</p>
            <p>メモ：エレベーターを降りて右後ろ／704号室</p>
            <div className="pt-2">
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <a href={SALON_MAP_URL} target="_blank" rel="noopener">
                  Googleマップで見る
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* キャンセルポリシー */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">キャンセルポリシー</h2>
        <Card>
          <CardContent className="py-5 text-sm text-slate-700">
            {CANCEL_POLICY_TEXT}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}