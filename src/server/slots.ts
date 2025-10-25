import type { SupabaseClient } from "@supabase/supabase-js";
import { addMinutes, areIntervalsOverlapping, max, min } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { MIN_HOURS_BEFORE_BOOKING, TIMEZONE } from "@/lib/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

const SLOT_INTERVAL_MINUTES = 15;

// Align the initial cursor to the next slot grid to avoid odd times
function roundUpToInterval(date: Date, minutes: number): Date {
  const intervalMs = minutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / intervalMs) * intervalMs);
}

// 型補助: Supabase の select 文字列により推論が崩れる箇所を明示型で補正
type ShiftsRow = Database["public"]["Tables"]["shifts"]["Row"];
type ReservationJoined = Database["public"]["Tables"]["reservations"]["Row"] & {
  service?: Pick<
    Database["public"]["Tables"]["services"]["Row"],
    "duration_min" | "buffer_before_min" | "buffer_after_min"
  > | null;
};
type StaffServiceJoined = {
  staff_id: string;
  staff: Database["public"]["Tables"]["staff"]["Row"] | null;
};

interface SlotParams {
  serviceId: string;
  date: string; // YYYY-MM-DD in timezone
  staffId?: string;
}

export interface AvailableSlot {
  start: string; // ISO string in Asia/Tokyo
  end: string; // ISO string in Asia/Tokyo
  staffId: string;
}

function toUtc(date: string, time: string) {
  const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
  const [hh, mm, ss = "00"] = time.split(":");
  const hours = parseInt(hh, 10);
  const minutes = parseInt(mm, 10);
  const seconds = parseInt(ss, 10);
  // Asia/Tokyo is UTC+09:00 year-round (no DST). Convert local JST to UTC.
  const utcMs = Date.UTC(y, m - 1, d, hours - 9, minutes, seconds, 0);
  return new Date(utcMs);
}

function formatLocalIso(date: Date) {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function expandInterval(
  start: Date,
  end: Date,
  beforeMin: number,
  afterMin: number,
) {
  return {
    start: addMinutes(start, -beforeMin),
    end: addMinutes(end, afterMin),
  };
}

async function resolveSlotInterval(
  client: SupabaseClient<Database>,
  {
    service,
    staffId,
  }: { service: any; staffId?: string }
): Promise<number> {
  // 1) スタッフ個別設定
  if (staffId) {
    const { data: staffRow } = await (client as any)
      .from("staff")
      .select("slot_interval_min")
      .eq("id", staffId)
      .maybeSingle();
    const staffInterval = (staffRow as any)?.slot_interval_min as number | null;
    if (staffInterval && staffInterval > 0) return staffInterval;
  }

  // 2) サービス別設定
  const serviceInterval = (service as any)?.slot_interval_min as number | null;
  if (serviceInterval && serviceInterval > 0) return serviceInterval;

  // 3) グローバル設定
  const { data: settings } = await (client as any)
    .from("site_settings")
    .select("default_slot_interval_min")
    .limit(1)
    .maybeSingle();
  const globalInterval = (settings as any)?.default_slot_interval_min as number | null;
  if (globalInterval && globalInterval > 0) return globalInterval;

  // 4) フォールバック（旧仕様）
  return SLOT_INTERVAL_MINUTES;
}

export async function getAvailableSlots({
  serviceId,
  date,
  staffId,
}: SlotParams) {
  const client = createSupabaseServiceRoleClient();
  const serviceRes = await client
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (serviceRes.error) {
    throw serviceRes.error;
  }

  const service = serviceRes.data as any;
  const isActive = Boolean(service?.active ?? service?.is_active ?? false);
  if (!service || !isActive) {
    return [];
  }

  const slotIntervalMin = await resolveSlotInterval(client, { service, staffId });

  const staffIds = staffId
    ? [staffId]
    : await getStaffIdsForService(client, serviceId);

  if (staffIds.length === 0) {
    return [];
  }

  const weekday = new Date(date).getUTCDay();
  const opening = await client
    .from("opening_hours")
    .select("*")
    .eq("weekday", weekday)
    .maybeSingle();

  if (opening.error) {
    throw opening.error;
  }

  const override = await client
    .from("date_overrides")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (override.error) {
    throw override.error;
  }

  const resolvedWindow = resolveOpenWindow(date, opening.data, override.data);
  if (!resolvedWindow) {
    return [];
  }

  const dayStartUtc = toUtc(date, "00:00:00").toISOString();
  const dayEndUtc = toUtc(date, "23:59:59").toISOString();

  const { data: shiftsRaw, error: shiftsError } = await client
    .from("shifts")
    .select("*")
    .in("staff_id", staffIds)
    .gte("start_at", dayStartUtc)
    .lte("start_at", dayEndUtc);

  if (shiftsError) {
    throw shiftsError;
  }
  const shiftsData = (shiftsRaw ?? []) as ShiftsRow[];

  const { data: reservationsRaw, error: reservationsError } = await client
    .from("reservations")
    .select(
      "*, service:service_id(duration_min, buffer_before_min, buffer_after_min)",
    )
    .in("staff_id", staffIds)
    .neq("status", "canceled")
    .gte("start_at", dayStartUtc)
    .lte("start_at", dayEndUtc);

  if (reservationsError) {
    throw reservationsError;
  }
  const reservationsData = (reservationsRaw ?? []) as ReservationJoined[];

  const now = new Date();
  const minLeadDate = addMinutes(now, MIN_HOURS_BEFORE_BOOKING * 60);

  const slots: AvailableSlot[] = [];

  for (const sid of staffIds) {
    const staffShifts = (shiftsData ?? []).filter(
      (shift) => shift.staff_id === sid,
    );
    const staffReservations = (reservationsData ?? []).filter(
      (reservation) => reservation.staff_id === sid,
    );

    const workingWindows =
      staffShifts.length > 0
        ? staffShifts.map((shift) => ({
            start: new Date(shift.start_at),
            end: new Date(shift.end_at),
          }))
        : [resolvedWindow];

    for (const window of workingWindows) {
      const windowStart = max([window.start, resolvedWindow.start]);
      const windowEnd = min([window.end, resolvedWindow.end]);

      let cursor = roundUpToInterval(addMinutes(windowStart, service.buffer_before_min), slotIntervalMin);

      while (cursor < windowEnd) {
        const serviceEnd = addMinutes(cursor, service.duration_min);
        const padded = expandInterval(
          cursor,
          serviceEnd,
          service.buffer_before_min,
          service.buffer_after_min,
        );

        if (padded.end > windowEnd) {
          break;
        }

        const overlapsReservation = staffReservations.some((reservation) => {
          const reservationStart = new Date(reservation.start_at);
          const reservationEnd = new Date(reservation.end_at);
          const bufferBefore = reservation.service?.buffer_before_min ?? 0;
          const bufferAfter = reservation.service?.buffer_after_min ?? 0;
          const reservationWindow = expandInterval(
            reservationStart,
            reservationEnd,
            bufferBefore,
            bufferAfter,
          );
          return areIntervalsOverlapping(
            { start: padded.start, end: padded.end },
            reservationWindow,
            { inclusive: false },
          );
        });

        if (!overlapsReservation && padded.start >= minLeadDate) {
          slots.push({
            staffId: sid,
            start: formatLocalIso(cursor),
            end: formatLocalIso(serviceEnd),
          });
        }

        cursor = addMinutes(cursor, slotIntervalMin);
      }
    }
  }

  return slots;
}

async function getStaffIdsForService(
  client: SupabaseClient<Database>,
  serviceId: string,
) {
  const { data, error } = await client
    .from("staff_services")
    .select("staff_id, staff:staff_id(*)")
    .eq("service_id", serviceId);

  if (error) {
    throw error;
  }
  const rows = (data ?? []) as StaffServiceJoined[];
  return rows
    .filter((row) => Boolean(row.staff?.active ?? (row.staff as any)?.is_active))
    .map((row) => row.staff_id);
}

function resolveOpenWindow(
  date: string,
  regular: Database["public"]["Tables"]["opening_hours"]["Row"] | null,
  override: Database["public"]["Tables"]["date_overrides"]["Row"] | null,
): { start: Date; end: Date } | null {
  if (override) {
    if (!override.is_open) {
      return null;
    }
    const open = override.open_at ?? regular?.open_at;
    const close = override.close_at ?? regular?.close_at;
    if (!open || !close) {
      return null;
    }
    return {
      start: toUtc(date, open),
      end: toUtc(date, close),
    };
  }

  if (!regular || !regular.is_open) {
    return null;
  }

  return {
    start: toUtc(date, regular.open_at),
    end: toUtc(date, regular.close_at),
  };
}
