import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDuration } from "@/lib/format";
import type { Dictionary } from "@/i18n/dictionaries";

interface ServiceCardProps {
  locale: string;
  dict: Dictionary;
  service: {
    id: string;
    name: string;
    description?: string | null;
    duration_min: number;
    price_jpy: number;
  };
}

export default function ServiceCard({
  locale,
  dict,
  service,
}: ServiceCardProps) {
  return (
    <Card className="h-full rounded-2xl shadow-md transition-transform hover:shadow-lg focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2">
      <CardHeader>
        <CardTitle className="text-[var(--ink)] text-xl font-semibold">
          {service.name}
        </CardTitle>
        {service.description ? (
          <CardDescription className="text-slate-600">
            {service.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge
            className="bg-slate-100 text-slate-700"
            aria-label={dict.services.duration}
          >
            {formatDuration(service.duration_min)}
          </Badge>
          <span className="text-xs text-slate-500">
            {dict.booking?.summary?.tax ?? "税込"}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500">{dict.services.price}</span>
          <span className="text-2xl font-bold text-[var(--ink)]">
            {formatCurrency(service.price_jpy)}
          </span>
        </div>
        <Button
          asChild
          className="mt-auto w-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
        >
          <Link href={`/${locale}/booking/${service.id}`}>
            {dict.services.choose}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
