"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SlotSelector from "@/components/booking/slot-selector";
import StickySummary from "@/components/booking/summary";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatDuration } from "@/lib/format";
import { formatDisplay } from "@/lib/time";

interface AvailableSlot {
  staffId: string;
  start: string;
  end: string;
}

interface Props {
  locale: string;
  dict: Dictionary;
  service: {
    id: string;
    name: string;
    duration_min: number;
    buffer_before_min: number;
    buffer_after_min: number;
    price_jpy: number;
  };
  staff: { id: string; name: string; color: string }[];
  onSlotChange?: (slot: AvailableSlot | null, extraRows?: { label: string; value: string }[], ctaHref?: string) => void;
}

export default function SelectClient({ locale, dict, service, staff, onSlotChange }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const durationLabel = useMemo(() => {
    if (locale === "ja") return `${service.duration_min}分`;
    if (locale === "zh") return `${service.duration_min}分钟`;
    return formatDuration(service.duration_min);
  }, [locale, service.duration_min]);

  const ctaHref = useMemo(() => {
    if (!selectedSlot) return undefined;
    const params = new URLSearchParams({
      staffId: selectedSlot.staffId,
      start: selectedSlot.start,
      end: selectedSlot.end,
    });
    return `/${locale}/booking/${service.id}/confirm?${params.toString()}`;
  }, [selectedSlot, locale, service.id]);

  const extraRows = useMemo(() => {
    if (!selectedSlot) return undefined;
    const staffName = staff.find((s) => s.id === selectedSlot.staffId)?.name ?? "-";
    return [
      { label: dict.booking.summary.staff, value: staffName },
      { label: dict.booking.summary.time, value: formatDisplay(selectedSlot.start) },
    ];
  }, [selectedSlot, staff, dict.booking.summary]);

  useEffect(() => {
    onSlotChange?.(selectedSlot, extraRows, ctaHref);
  }, [selectedSlot, extraRows, ctaHref, onSlotChange]);

  return (
    <>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-[var(--ink)]">{dict.select.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <SlotSelector
            locale={locale}
            dict={dict}
            service={service}
            staff={staff}
            onSelectSlot={(slot) => setSelectedSlot(slot)}
            selectedSlot={selectedSlot}
          />
        </CardContent>
      </Card>

      <div className="lg:hidden sticky bottom-0 z-10">
        <StickySummary
          dict={dict}
          serviceName={service.name}
          priceJpy={service.price_jpy}
          durationLabel={durationLabel}
          ctaLabel={dict.booking.summary.next}
          ctaHref={ctaHref}
          disabled={!selectedSlot}
          extraRows={extraRows}
          durationNote={{
            treatmentMin: service.duration_min - (service.buffer_before_min + service.buffer_after_min),
            bufferBeforeMin: service.buffer_before_min,
            bufferAfterMin: service.buffer_after_min,
          }}
        />
      </div>
    </>
  );
}