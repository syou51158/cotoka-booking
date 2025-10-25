import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDictionary } from "@/i18n/dictionaries";
import { formatCurrency, formatDuration } from "@/lib/format";
import { getServiceWithRelations } from "@/server/services";

interface Props {
  params: Promise<{ locale: string; serviceId: string }>;
}

export default async function ServiceDetailPage({ params }: Props) {
  const resolved = await params;
  const { serviceId, locale } = resolved;
  const service = await getServiceWithRelations(serviceId);
  if (!service) {
    notFound();
  }

  const dict = getDictionary(locale);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10">
      <Button asChild variant="link" className="px-0">
        <Link href={`/${locale}/booking`}>← {dict.common.back}</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-900">
            {service.name}
          </CardTitle>
          <CardDescription>{service.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <span>
              {dict.services.duration}: {formatDuration(service.duration_min)}
            </span>
            <span>
              {dict.services.price}: {formatCurrency(service.price_jpy)}
            </span>
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {dict.serviceDetail.staffTitle}
            </h2>
            <div className="flex flex-wrap gap-2">
              {service.staff.length === 0 ? (
                <span className="text-sm text-slate-500">
                  スタッフ情報がありません。
                </span>
              ) : (
                service.staff.map((staff) => (
                  <Badge key={staff.id} className="bg-slate-100 text-slate-700">
                    {staff.display_name}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/${locale}/booking/${service.id}/select`}>
              {dict.serviceDetail.proceed}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
