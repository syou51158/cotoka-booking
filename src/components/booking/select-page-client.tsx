"use client";

import { useState } from "react";
import SelectClient from "@/components/booking/select-client";
import StickySummary from "@/components/booking/summary";
import { formatDuration } from "@/lib/format";
import type { Dictionary } from "@/i18n/dictionaries";

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
}

export default function SelectPageClient({ locale, dict, service, staff }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [extraRows, setExtraRows] = useState<{ label: string; value: string }[] | undefined>();
  const [ctaHref, setCtaHref] = useState<string | undefined>();

  const handleSlotChange = (
    slot: AvailableSlot | null,
    rows?: { label: string; value: string }[],
    href?: string
  ) => {
    setSelectedSlot(slot);
    setExtraRows(rows);
    setCtaHref(href);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <SelectClient
        locale={locale}
        dict={dict}
        service={service}
        staff={staff}
        onSlotChange={handleSlotChange}
      />

      <div className="hidden lg:block">
        <div className="md:sticky md:top-24">
          <StickySummary
            dict={dict}
            serviceName={service.name}
            priceJpy={service.price_jpy}
            durationLabel={formatDuration(service.duration_min)}
            ctaLabel={selectedSlot ? dict.booking.summary.next : undefined}
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
      </div>
    </div>
  );
}