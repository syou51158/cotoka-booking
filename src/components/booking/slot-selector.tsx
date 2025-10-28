"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addDays, format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";
import { showToast } from "@/lib/toast";

interface SlotSelectorProps {
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
  staff: {
    id: string;
    name: string;
    color: string;
  }[];
  onSelectSlot?: (slot: AvailableSlot) => void;
  selectedSlot?: AvailableSlot | null;
}

interface AvailableSlot {
  staffId: string;
  start: string;
  end: string;
}

const DAYS_VISIBLE = 7;
const TOTAL_DAYS = 14;

export default function SlotSelector({
  locale,
  dict,
  service,
  staff,
  onSelectSlot,
  selectedSlot,
}: SlotSelectorProps) {
  const router = useRouter();
  const [activeStaffId, setActiveStaffId] = useState(() => staff[0]?.id ?? "");
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => {
    return Array.from({ length: TOTAL_DAYS }, (_, index) =>
      addDays(new Date(), index),
    );
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSlots() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serviceId: service.id,
            staffId: activeStaffId,
            date: format(selectedDate, "yyyy-MM-dd"),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = typeof (payload as any)?.message === "string" ? (payload as any).message : "Failed to load slots";
          throw new Error(message);
        }

        const data = (await response.json()) as AvailableSlot[];
        if (!ignore) {
          setSlots(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unknown error");
          showToast({
            title: "通信に失敗しました。時間をおいて再度お試しください。",
            variant: "error",
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (activeStaffId) {
      loadSlots();
    }

    return () => {
      ignore = true;
    };
  }, [activeStaffId, selectedDate, service.id]);

  const daySlice = days.slice(dayOffset, dayOffset + DAYS_VISIBLE);

  const handleSelectSlot = (slot: AvailableSlot) => {
    if (onSelectSlot) {
      onSelectSlot(slot);
      return;
    }
    startTransition(() => {
      const params = new URLSearchParams({
        staffId: slot.staffId,
        start: slot.start,
        end: slot.end,
      });
      router.push(
        `/${locale}/booking/${service.id}/confirm?${params.toString()}`,
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          {dict.select.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 overflow-x-auto">
          {staff.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                setActiveStaffId(member.id);
                setSelectedDate(new Date());
                setDayOffset(0);
              }}
              aria-label={`スタッフ ${member.name} を選択`}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                activeStaffId === member.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
              )}
            >
              {member.name}
            </button>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDayOffset((offset) => Math.max(0, offset - DAYS_VISIBLE))
            }
            disabled={dayOffset === 0}
          >
            {dict.select.prevWeek}
          </Button>
          <div className="flex gap-2">
            {daySlice.map((date) => {
              const value = format(date, "yyyy-MM-dd");
              const isActive = format(selectedDate, "yyyy-MM-dd") === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-label={`日付 ${format(date, "yyyy-MM-dd")} を選択`}
                  className={cn(
                    "min-w-[90px] rounded-lg border px-3 py-2 text-center text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <div className="font-semibold">{format(date, "MM/dd")}</div>
                  <div className="text-xs">{format(date, "EEE")}</div>
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDayOffset((offset) =>
                Math.min(TOTAL_DAYS - DAYS_VISIBLE, offset + DAYS_VISIBLE),
              )
            }
            disabled={dayOffset >= TOTAL_DAYS - DAYS_VISIBLE}
          >
            {dict.select.nextWeek}
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {dict.select.timezone}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600" role="alert" aria-live="polite">
              {error}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border bg-[var(--accent)]/8 p-4 text-[var(--ink)]">
              <div className="mb-2 text-sm">{dict.select.noSlots}</div>
              <div className="text-xs text-slate-600">{dict.booking.empty?.noSlotsHint ?? "別の日や別の担当者をご検討ください。"}</div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="別の週を表示"
                  onClick={() =>
                    setDayOffset((offset) =>
                      Math.min(TOTAL_DAYS - DAYS_VISIBLE, offset + DAYS_VISIBLE),
                    )
                  }
                >
                  {dict.select.nextWeek}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="担当者を変更"
                  onClick={() => {
                    const idx = staff.findIndex((s) => s.id === activeStaffId);
                    const next = staff[(idx + 1) % staff.length];
                    if (next) {
                      setActiveStaffId(next.id);
                      setSelectedDate(new Date());
                      setDayOffset(0);
                    }
                  }}
                >
                  別の担当者
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((slot) => {
                const startDate = new Date(slot.start);
                const endDate = new Date(slot.end);
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                  console.warn("Invalid slot time:", slot);
                  return null;
                }
                const isSelected = Boolean(
                  selectedSlot &&
                  selectedSlot.staffId === slot.staffId &&
                  selectedSlot.start === slot.start
                );
                return (
                  <Button
                    key={`${slot.staffId}-${slot.start}`}
                    variant="outline"
                    className={cn(
                      "justify-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : ""
                    )}
                    disabled={isPending}
                    onClick={() => handleSelectSlot(slot)}
                    aria-label={`時間 ${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")} を選択`}
                    aria-selected={isSelected}
                  >
                    {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                  </Button>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
