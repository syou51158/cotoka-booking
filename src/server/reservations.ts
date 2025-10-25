import { addHours, addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { customAlphabet } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { MIN_HOURS_BEFORE_BOOKING, TIMEZONE } from "@/lib/config";
import type { Database } from "@/types/database";
import { recordEvent } from "./events";
import { sendReservationConfirmationEmail } from "./notifications";

const randomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

export type ReservationRow =
  Database["public"]["Tables"]["reservations"]["Row"];

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

// 型補助: JOIN/カラム限定のselectで崩れる型を補正
type ReservationConflictJoined = {
  start_at: ReservationRow["start_at"];
  end_at: ReservationRow["end_at"];
  service?: Pick<
    Database["public"]["Tables"]["services"]["Row"],
    "buffer_before_min" | "buffer_after_min"
  > | null;
};

type ReservationLookupRow = ReservationRow & {
  service?: Pick<
    Database["public"]["Tables"]["services"]["Row"],
    "name" | "duration_min"
  > | null;
  staff?: Pick<
    Database["public"]["Tables"]["staff"]["Row"],
    "display_name" | "color"
  > | null;
};

type ReservationContactUpdateResult = Pick<
  ReservationRow,
  "id" | "customer_email" | "customer_phone" | "notes"
>;

export interface CreateReservationInput {
  serviceId: string;
  staffId?: string | null;
  roomId?: string | null;
  start: string; // Local ISO string (Asia/Tokyo)
  end?: string; // Optional local ISO; if omitted we derive from service duration
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  locale?: string;
  notes?: string | null;
  paymentOption?: "pay_in_store" | "prepay";
}

export type CreatePendingReservationResult =
  | { data: ReservationRow }
  | { error: { code: string; message: string } };

export async function getReservationById(
  id: string,
): Promise<ReservationRow | null> {
  const client = createSupabaseServiceRoleClient() as any;
  const { data, error } = await client
    .from("reservations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ReservationRow | null;
}

export async function markReservationPaid(
  reservationId: string,
  payload: Partial<Database["public"]["Tables"]["reservations"]["Update"]>,
): Promise<ReservationRow | null> {
  const client = createSupabaseServiceRoleClient() as any;
  const { data, error } = await client
    .from("reservations")
    .update({
      updated_at: new Date().toISOString(),
      ...payload,
    })
    .eq("id", reservationId)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ReservationRow | null;
}

export async function createPendingReservation(input: CreateReservationInput): Promise<CreatePendingReservationResult> {
  const client = createSupabaseServiceRoleClient() as any;
  const {
    serviceId,
    staffId,
    roomId,
    start,
    end,
    customerName,
    customerEmail,
    customerPhone,
    locale,
    notes,
    paymentOption,
  } = input;

  const normalizedEmail = customerEmail
    ? customerEmail.trim().toLowerCase()
    : null;
  const normalizedPhoneRaw = customerPhone ? normalizePhone(customerPhone) : "";
  const normalizedPhone =
    normalizedPhoneRaw.length > 0 ? normalizedPhoneRaw : null;

  if (!normalizedEmail && !normalizedPhone) {
    return {
      error: {
        code: "CONTACT_REQUIRED",
        message: "連絡先を入力してください",
      },
    } as const;
  }

  const startUtc = parseToUtc(start);
  const nowPlusLead = addHours(new Date(), MIN_HOURS_BEFORE_BOOKING);
  if (startUtc < nowPlusLead) {
    return {
      error: {
        code: "LEAD_TIME",
        message: "直近のご予約は受付できません",
      },
    } as const;
  }

  const serviceRes = await client
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (serviceRes.error) {
    throw serviceRes.error;
  }

  const service = serviceRes.data;
  if (!service) {
    return {
      error: {
        code: "SERVICE_NOT_FOUND",
        message: "サービスが見つかりません",
      },
    } as const;
  }

  const endUtc = computeEndUtc({ service, start, end });

  const conflict = await hasConflict(client, {
    staffId,
    roomId,
    startUtc,
    endUtc,
    service,
  });

  if (conflict) {
    return {
      error: {
        code: "SLOT_TAKEN",
        message: "この時間は満席になりました",
      },
    } as const;
  }

  const reservationCode = buildReservationCode(startUtc);

  const initialStatus: ReservationRow["status"] = service.requires_prepayment
    ? "pending"
    : "unpaid";

  const { data, error } = await client
    .from("reservations")
    .insert({
      code: reservationCode,
      customer_name: customerName,
      customer_email: normalizedEmail,
      customer_phone: normalizedPhone,
      service_id: serviceId,
      staff_id: staffId ?? null,
      room_id: roomId ?? null,
      start_at: startUtc.toISOString(),
      end_at: endUtc.toISOString(),
      status: initialStatus,
      amount_total_jpy: service.price_jpy,
      locale: locale ?? "ja",
      notes: notes ?? null,
      payment_option: paymentOption ?? null,
    })
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        error: {
          code: "SLOT_TAKEN",
          message: "この時間は満席になりました",
        },
      } as const;
    }
    throw error;
  }

  // 事前決済不要の場合は作成時点で確認メールを送信する
  try {
    if (initialStatus === "unpaid" && data?.id) {
      await sendReservationConfirmationEmail(data.id);
      await recordEvent("reservation.created.unpaid", {
        reservation_id: data.id,
        code: data.code,
      });
    } else if (initialStatus === "pending" && data?.id) {
      await recordEvent("reservation.created.pending", {
        reservation_id: data.id,
        code: data.code,
      });
    }
  } catch (e) {
    console.warn("Post-create actions failed", e);
  }

  return { data: data as ReservationRow } as const;
}

function buildReservationCode(startUtc: Date) {
  const base = formatInTimeZone(startUtc, TIMEZONE, "yyyyMMdd");
  return `COT-${base}-${randomCode()}`;
}

function computeEndUtc({
  service,
  start,
  end,
}: {
  service: ServiceRow;
  start: string;
  end?: string | null;
}) {
  if (end) {
    return parseToUtc(end);
  }
  const startUtc = parseToUtc(start);
  return addMinutes(startUtc, service.duration_min);
}

async function hasConflict(
  client: SupabaseClient<Database>,
  params: {
    staffId?: string | null;
    roomId?: string | null;
    startUtc: Date;
    endUtc: Date;
    service: ServiceRow;
  },
) {
  const { staffId, roomId, startUtc, endUtc, service } = params;

  if (!staffId && !roomId) {
    return false;
  }

  let query = (client as any)
    .from("reservations")
    .select(
      "start_at, end_at, service:service_id(buffer_before_min, buffer_after_min)",
    )
    .neq("status", "canceled")
    .gt("end_at", startUtc.toISOString())
    .lt("start_at", endUtc.toISOString());

  if (staffId && roomId) {
    query = query.or(`staff_id.eq.${staffId},room_id.eq.${roomId}`);
  } else if (staffId) {
    query = query.eq("staff_id", staffId);
  } else if (roomId) {
    query = query.eq("room_id", roomId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const newWindow = expandInterval(
    startUtc,
    endUtc,
    service.buffer_before_min,
    service.buffer_after_min,
  );

  const rows = (data ?? []) as ReservationConflictJoined[];
  return rows.some((reservation) => {
    const start = new Date(reservation.start_at);
    const end = new Date(reservation.end_at);
    const bufferBefore = reservation.service?.buffer_before_min ?? 0;
    const bufferAfter = reservation.service?.buffer_after_min ?? 0;
    const existingWindow = expandInterval(
      start,
      end,
      bufferBefore,
      bufferAfter,
    );

    return (
      existingWindow.start < newWindow.end &&
      existingWindow.end > newWindow.start
    );
  });
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

export async function lookupReservationByCode(
  code: string,
  contact: string,
): Promise<ReservationLookupRow | null> {
  const supabase = createSupabaseServiceRoleClient() as any;
  const normalizedContact = contact.trim().toLowerCase();
  const sanitizedPhone = normalizePhone(contact);

  const { data, error } = await supabase
    .from("reservations")
    .select(
      "*, service:service_id(name,duration_min), staff:staff_id(display_name,color)",
    )
    .eq("code", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as ReservationLookupRow;
  const emailMatches =
    row.customer_email && row.customer_email.toLowerCase() === normalizedContact;
  const phoneMatches =
    row.customer_phone && normalizePhone(row.customer_phone) === sanitizedPhone;

  if (!emailMatches && !phoneMatches) {
    return null;
  }

  return row;
}

export async function updateReservationContact(
  reservationId: string,
  payload: {
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    locale?: string | null;
  },
) : Promise<ReservationContactUpdateResult | null> {
  const supabase = createSupabaseServiceRoleClient() as any;
  const normalizedEmail = payload.email
    ? payload.email.trim().toLowerCase()
    : null;
  const normalizedPhoneRaw = payload.phone ? normalizePhone(payload.phone) : "";
  const normalizedPhone =
    normalizedPhoneRaw.length > 0 ? normalizedPhoneRaw : null;
  const { data, error } = await supabase
    .from("reservations")
    .update({
      customer_email: normalizedEmail,
      customer_phone: normalizedPhone,
      notes: payload.notes ?? null,
      locale: payload.locale ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .select("id, customer_email, customer_phone, notes")
    .maybeSingle();

  if (error) throw error;
  return data as ReservationContactUpdateResult | null;
}

export async function customerCancelReservation(
  reservationId: string,
  reason?: string,
) {
  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("reservations")
    .update({
      status: "canceled",
      notes: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .in("status", ["paid", "confirmed"])
    .select("id, code, customer_email, customer_phone")
    .maybeSingle();

  if (error) throw error;
  if (data) {
    const base = data as Pick<
      ReservationRow,
      "id" | "code" | "customer_email" | "customer_phone"
    >;
    await recordEvent("reservation.canceled.customer", {
      ...base,
      reason: reason ?? null,
    });
  }
  return data;
}

function parseToUtc(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  // Fallback: assume value is a parseable ISO string; if not, return invalid Date.
  // Our inputs (start/end) are generated via toZonedISOString including offset, so this path should rarely be hit.
  return new Date(value);
}

export function normalizePhone(value: string | null | undefined) {
  return value ? value.replace(/[^0-9]/g, "") : "";
}
