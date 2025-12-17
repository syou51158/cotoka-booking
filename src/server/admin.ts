import { addDays, endOfDay, startOfDay } from "date-fns";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { recordEvent } from "./events";

const client = () => createSupabaseServiceRoleClient();

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type OpeningHourRow = Database["public"]["Tables"]["opening_hours"]["Row"];
type DateOverrideRow = Database["public"]["Tables"]["date_overrides"]["Row"];
type ShiftRow = any;

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

type AdminReservation = ReservationRow & {
  service?: Pick<ServiceRow, "name" | "duration_min">;
  staff?: Pick<StaffRow, "id" | "display_name" | "email" | "phone" | "color">;
};

interface ReservationFilters {
  from?: string;
  to?: string;
  staffId?: string;
  serviceId?: string;
  status?: ReservationRow["status"];
}

export async function getAdminReservations(filters?: ReservationFilters) {
  const supabase = client();
  const from = filters?.from ? new Date(filters.from) : startOfDay(new Date());
  const to = filters?.to ? new Date(filters.to) : endOfDay(addDays(from, 1));

  let query = supabase
    .from("reservations")
    .select(
      "*, service:service_id(name,duration_min), staff:staff_id(id,display_name,email,phone,color)",
    )
    .gte("start_at", from.toISOString())
    .lt("start_at", to.toISOString())
    .order("start_at", { ascending: true });

  if (filters?.staffId) {
    query = query.eq("staff_id", filters.staffId);
  }

  if (filters?.serviceId) {
    query = query.eq("service_id", filters.serviceId);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as AdminReservation[];
}

export async function updateReservationNotes(
  reservationId: string,
  notes: string | null,
) {
  const supabase = client();
  const updates: Database["public"]["Tables"]["reservations"]["Update"] = {
    notes,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("reservations")
    .update(updates as any)
    .eq("id", reservationId)
    .select("id, notes")
    .maybeSingle();

  if (error) {
    throw error;
  }

  await recordEvent("reservation.notes.updated", {
    reservation_id: reservationId,
    notes,
  } as any);

  return data;
}

export async function cancelReservation(
  reservationId: string,
  reason?: string,
) {
  const supabase = client();
  const updates: Database["public"]["Tables"]["reservations"]["Update"] = {
    status: "canceled",
    notes: reason ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("reservations")
    .update(updates as any)
    .eq("id", reservationId)
    .select(
      "id, code, customer_email, customer_phone, service:service_id(name)",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    await recordEvent("reservation.canceled", data as any);
  }

  return data;
}

export async function getOpeningHours() {
  const supabase = client();
  const { data, error } = await supabase
    .from("opening_hours")
    .select("*")
    .order("weekday", { ascending: true });
  if (error) throw error;
  return data as OpeningHourRow[];
}

export async function upsertOpeningHour(
  entry: Partial<OpeningHourRow> & { weekday: number },
) {
  const supabase = client();
  const values: Database["public"]["Tables"]["opening_hours"]["Insert"] = {
    id: entry.id,
    weekday: entry.weekday,
    open_at: entry.open_at!,
    close_at: entry.close_at!,
    is_open: entry.is_open ?? true,
  };
  const { error } = await supabase
    .from("opening_hours")
    .upsert(values as any, { onConflict: "weekday" });
  if (error) throw error;
}

export async function getDateOverrides() {
  const supabase = client();
  const { data, error } = await supabase
    .from("date_overrides")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data as DateOverrideRow[];
}

export async function upsertDateOverride(
  payload: Partial<DateOverrideRow> & { date: string },
) {
  const supabase = client();
  const values: Database["public"]["Tables"]["date_overrides"]["Insert"] = {
    id: payload.id,
    date: payload.date,
    open_at: payload.open_at ?? null,
    close_at: payload.close_at ?? null,
    is_open: payload.is_open ?? false,
    note: payload.note ?? null,
  };
  const { error } = await supabase.from("date_overrides").upsert(values as any);
  if (error) throw error;
}

export async function deleteDateOverride(id: string) {
  const supabase = client();
  const { error } = await supabase.from("date_overrides").delete().eq("id", id);
  if (error) throw error;
}

export async function getShifts(range?: { from?: string; to?: string }) {
  const supabase = client();
  const { data, error } = await (supabase as any)
    .from("shifts")
    .select("*, staff:staff_id(display_name,color)")
    .gte("start_at", range?.from ?? new Date().toISOString())
    .order("start_at", { ascending: true });
  if (error) throw error;
  return data as (ShiftRow & {
    staff?: Pick<StaffRow, "display_name" | "color">;
  })[];
}

export async function upsertShift(
  payload: Partial<ShiftRow> & {
    staff_id: string;
    start_at: string;
    end_at: string;
  },
) {
  const supabase = client();
  const values: any = {
    id: payload.id,
    staff_id: payload.staff_id,
    start_at: payload.start_at,
    end_at: payload.end_at,
    note: payload.note ?? null,
  };
  const { error } = await (supabase as any).from("shifts").upsert(values as any);
  if (error) throw error;
}

export async function deleteShift(id: string) {
  const supabase = client();
  const { error } = await (supabase as any).from("shifts").delete().eq("id", id);
  if (error) throw error;
}

export async function getStaffDirectory() {
  const supabase = client();
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("display_name");
  if (error) throw error;
  return data as StaffRow[];
}

export async function settleReservationPayment(
  reservationId: string,
  method: "cash" | "card" | "other",
  amount?: number,
) {
  const supabase = client();
  const { data: row, error: fetchError } = await supabase
    .from("reservations")
    .select(
      "id, status, amount_total_jpy, paid_amount_jpy, payment_option, code",
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) throw new Error("Reservation not found");

  // 事前チェック: canceled / paid は不可
  if (row.status === "canceled" || row.status === "paid") {
    const err = new Error(
      "キャンセル済み／支払い済みの予約には入金を記録できません",
    );
    (err as any).statusCode = 400;
    throw err;
  }

  const currentPaid = (row as any).paid_amount_jpy ?? 0;
  const total = (row as any).amount_total_jpy ?? 0;
  const remaining = Math.max(total - currentPaid, 0);

  const finalAmount =
    typeof amount === "number" && !Number.isNaN(amount) ? amount : remaining;

  // 金額バリデーション: 0 < amount <= remaining
  if (!(finalAmount > 0) || finalAmount > remaining) {
    const err = new Error(
      "不正な金額です（0より大きく、残額以内で指定してください）",
    );
    (err as any).statusCode = 400;
    throw err;
  }

  const newPaid = currentPaid + finalAmount;
  const newStatus = newPaid >= total ? "paid" : row.status;

  const updates = {
    status: newStatus,
    paid_amount_jpy: newPaid,
    payment_method: method,
    payment_collected_at: new Date().toISOString(),
    payment_option: (row as any).payment_option ?? "pay_in_store",
    updated_at: new Date().toISOString(),
  } as any;

  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", reservationId)
    .select(
      "id, status, paid_amount_jpy, payment_method, payment_collected_at, code",
    )
    .maybeSingle();

  if (error) throw error;

  // 監査: reservation_settled（差分を含める）
  await recordEvent("reservation_settled", {
    reservation_id: reservationId,
    code: (row as any).code,
    before: {
      status: row.status,
      paid_amount_jpy: currentPaid,
    },
    applied_amount_jpy: finalAmount,
    after: {
      status: (data as any)?.status ?? newStatus,
      paid_amount_jpy: (data as any)?.paid_amount_jpy ?? newPaid,
    },
    payment_method: method,
    payment_collected_at: updates.payment_collected_at,
  } as any);

  return data;
}

// 支払い履歴（reservation_settled / reservation_paid）を取得
export async function getReservationPaymentHistory(reservationId: string) {
  const supabase = client();
  const { data, error } = (await supabase
    .from("events")
    .select("type, payload, created_at")
    .in("type", ["reservation_settled", "reservation_paid"])) as any;

  if (error) throw error;

  // payload の reservation_id でフィルタ（JSON部の包含）
  const filtered = (data ?? []).filter((row: any) => {
    const p = row.payload as any;
    return p && p.reservation_id === reservationId;
  });

  const items = filtered.map((row: any) => {
    const p = row.payload as any;
    const isSettled = row.type === "reservation_settled";
    const collectedAt =
      (p?.payment_collected_at as string | undefined) ?? row.created_at;
    const amount =
      (p?.applied_amount_jpy as number | undefined) ??
      (p?.paid_amount_jpy as number | undefined) ??
      null;
    const method =
      (p?.payment_method as string | undefined) ??
      (isSettled ? "other" : "card");
    const source = isSettled ? "管理画面" : "Stripe";
    return {
      type: row.type as string,
      at: collectedAt as string,
      amount_jpy: amount as number | null,
      method: method as string,
      source,
      details: {
        stripe_checkout_session: p?.stripe_checkout_session ?? null,
        stripe_payment_intent: p?.stripe_payment_intent ?? null,
      },
    };
  }) as Array<{
    type: string;
    at: string;
    amount_jpy: number | null;
    method: string;
    source: string;
    details: {
      stripe_checkout_session: string | null;
      stripe_payment_intent: string | null;
    };
  }>;

  // 時間順に並べ替え
  items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return items;
}

// スロット設定: グローバル / サービス / スタッフ
export async function getSiteSettings() {
  const supabase = client();
  const { data, error } = await (supabase as any)
    .from("site_settings")
    .select("id, default_slot_interval_min")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? { id: null, default_slot_interval_min: 15 };
}

export async function updateSiteSettings(defaultSlotIntervalMin: number) {
  const supabase = client();
  // 既存行を探す
  const { data: existing } = await (supabase as any)
    .from("site_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from("site_settings")
      .update({
        default_slot_interval_min: defaultSlotIntervalMin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from("site_settings").insert({
      default_slot_interval_min: defaultSlotIntervalMin,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

export async function updateServiceSlotInterval(
  serviceId: string,
  minutes: number | null,
) {
  const supabase = client();
  const { error } = await (supabase as any)
    .from("services")
    .update({ slot_interval_min: minutes })
    .eq("id", serviceId);
  if (error) throw error;
}

export async function updateStaffSlotInterval(
  staffId: string,
  minutes: number | null,
) {
  const supabase = client();
  const { error } = await (supabase as any)
    .from("staff")
    .update({ slot_interval_min: minutes })
    .eq("id", staffId);
  if (error) throw error;
}
