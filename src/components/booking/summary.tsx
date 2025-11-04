import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";

interface SummaryProps {
  dict: Dictionary;
  serviceName: string;
  priceJpy: number;
  durationLabel?: string;
  ctaLabel?: string;
  ctaHref?: string;
  disabled?: boolean;
  extraRows?: { label: string; value: string }[];
  durationNote?: {
    treatmentMin: number;
    bufferBeforeMin?: number;
    bufferAfterMin?: number;
  };
}

export default function StickySummary({
  dict,
  serviceName,
  priceJpy,
  durationLabel,
  ctaLabel,
  ctaHref,
  disabled,
  extraRows,
  durationNote,
}: SummaryProps) {
  const formattedPrice = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(priceJpy);

  return (
    <Card className="h-fit rounded-2xl border-slate-200 bg-white shadow-md">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
          {dict.booking.summary.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-700">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {dict.booking.summary.menu}
          </div>
          <div className="font-medium text-[var(--ink)]">{serviceName}</div>
        </div>
        {extraRows?.map((row, idx) => (
          <div key={idx}>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              {row.label}
            </div>
            <div className="font-medium text-[var(--ink)]">{row.value}</div>
          </div>
        ))}
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {dict.services.duration ?? dict.booking.summary.duration}
          </div>
          <div className="font-medium text-[var(--ink)]">
            {durationLabel ?? "-"}
          </div>
        </div>
        <div aria-live="polite">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {dict.booking.summary.total}
          </div>
          <div className="text-lg font-semibold text-[var(--ink)]">
            {formattedPrice}
            <span className="ml-2 align-middle text-xs text-slate-500">
              {dict.booking.summary.tax}
            </span>
          </div>
        </div>
        {ctaLabel ? (
          <Button
            asChild
            className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            disabled={disabled}
          >
            <a href={ctaHref ?? "#"} aria-label={ctaLabel}>
              {ctaLabel}
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
