import { Resend } from "resend";
import { formatInTimeZone } from "date-fns-tz";
import { addHours, addMinutes, subMinutes } from "date-fns";
import { SITE_NAME, SITE_URL, TIMEZONE, SALON_NAME, SALON_ADDRESS, SALON_PHONE, SALON_MAP_URL, CANCEL_POLICY_TEXT } from "@/lib/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { recordEvent } from "./events";

const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL ?? "";
let resendClient: Resend | null = null;
const ENABLE_DEV_DRY_RUN = process.env.ALLOW_DEV_MOCKS === "true";

function getResend() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !FROM_EMAIL) {
    console.warn(
      "Notification provider is not fully configured. Skipping email send.",
    );
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendEmailWithRetry(
  params: { to: string; subject: string; text?: string; html?: string; meta?: Record<string, any> },
  maxAttempts = 3,
): Promise<{ ok: boolean; attempt: number; emailId?: string }> {
  const resend = getResend();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (resend) {
        const emailData: any = {
          from: FROM_EMAIL,
          to: params.to,
          subject: params.subject,
        };
        
        if (params.html) {
          emailData.html = params.html;
        }
        if (params.text) {
          emailData.text = params.text;
        }
        
        const result = await resend.emails.send(emailData);
        await recordEvent("email_sent", {
          ...(params.meta ?? {}),
          to: params.to,
          subject: params.subject,
          provider: "resend",
          attempt,
          dry_run: false,
          email_id: result.data?.id,
        } as any);
        return { ok: true, attempt, emailId: result.data?.id };
      } else if (ENABLE_DEV_DRY_RUN) {
        await recordEvent("email_sent", {
          ...(params.meta ?? {}),
          to: params.to,
          subject: params.subject,
          provider: "dry_run",
          attempt,
          dry_run: true,
        } as any);
        return { ok: true, attempt };
      } else {
        throw new Error("Email provider not configured");
      }
    } catch (error) {
      await recordEvent("email_send_failed", {
        ...(params.meta ?? {}),
        to: params.to,
        subject: params.subject,
        provider: resend ? "resend" : "none",
        attempt,
        error: error instanceof Error ? error.message : String(error),
      } as any);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  return { ok: false, attempt: maxAttempts };
}

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];

type ReservationWithRelations = ReservationRow & {
  service?: Pick<
    Database["public"]["Tables"]["services"]["Row"],
    "name" | "duration_min"
  > | null;
  staff?: Pick<
    Database["public"]["Tables"]["staff"]["Row"],
    "display_name" | "email"
  > | null;
};

export async function sendReservationConfirmationEmail(reservationId: string) {
  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "*, service:service_id(name,duration_min), staff:staff_id(display_name,email)",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (error) throw error;
  const joined = data as ReservationWithRelations | null;
  if (!joined || !joined.customer_email) {
    return;
  }

  const subject = `[${SITE_NAME}] ご予約が確定しました (${joined.code})`;
  const start = formatInTimeZone(
    joined.start_at,
    TIMEZONE,
    "yyyy年MM月dd日 (EEE) HH:mm",
  );
  const body = `\
${joined.customer_name} 様\n\n${SALON_NAME} のご予約ありがとうございます。以下の内容で確定しました。\n\n- 予約番号: ${joined.code}\n- メニュー: ${joined.service?.name ?? "未設定"}\n- 日時: ${start}\n- 担当: ${joined.staff?.display_name ?? "未定"}\n\n店舗情報:\n- 店名: ${SALON_NAME}\n- 住所: ${SALON_ADDRESS.streetAddress}（${SALON_ADDRESS.addressLocality} ${SALON_ADDRESS.addressRegion}）\n- 電話: ${SALON_PHONE || "—"}\n- 地図: ${SALON_MAP_URL}\n\nキャンセル規定:\n${CANCEL_POLICY_TEXT}\n\nご来店を心よりお待ちしております。\n\n${SITE_NAME}\n${SITE_URL}\n`;

  const result = await sendEmailWithRetry({
    to: joined.customer_email,
    subject,
    text: body,
    meta: { kind: "confirmation", reservation_id: reservationId, code: joined.code },
  });

  if (result.ok) {
    await recordEvent("reservation.confirmation.sent", {
      reservation_id: reservationId,
      customer_email: joined.customer_email,
    } as any);
  }
}

type ReminderKind = "24h" | "2h";

interface ReminderOptions {
  referenceDate?: Date;
  windowMinutes?: Partial<
    Record<ReminderKind, { before: number; after: number }>
  >;
}

const DEFAULT_WINDOWS: Record<ReminderKind, { before: number; after: number }> =
  {
    "24h": { before: 15, after: 60 },
    "2h": { before: 15, after: 45 },
  };

export async function processReservationReminders(
  options: ReminderOptions = {},
) {
  const supabase = createSupabaseServiceRoleClient() as any;
  const now = options.referenceDate ?? new Date();
  const offsets: Array<{ hours: number; kind: ReminderKind }> = [
    { hours: 24, kind: "24h" },
    { hours: 2, kind: "2h" },
  ];
  let sent = 0;

  for (const { hours, kind } of offsets) {
    const override = options.windowMinutes?.[kind];
    const windowConfig = override ?? DEFAULT_WINDOWS[kind];
    const windowStart = subMinutes(addHours(now, hours), windowConfig.before);
    const windowEnd = addMinutes(addHours(now, hours), windowConfig.after);

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*, service:service_id(name), staff:staff_id(display_name)")
      .in("status", ["paid", "confirmed"])
      .gte("start_at", windowStart.toISOString())
      .lt("start_at", windowEnd.toISOString());

    if (error) throw error;

    const rows = (reservations ?? []) as ReservationWithRelations[];
    if (!rows.length) continue;

    for (const reservation of rows) {
      if (!reservation.customer_email) continue;

      const alreadySent = await hasReminderBeenSent(reservation.id, kind);
      if (alreadySent) {
        continue;
      }

      const subject = `[${SITE_NAME}] ご予約${hours}時間前のリマインダー (${reservation.code})`;
      const start = formatInTimeZone(
        reservation.start_at,
        TIMEZONE,
        "yyyy年MM月dd日 (EEE) HH:mm",
      );
      const body = `\
${reservation.customer_name} 様\n\nまもなくご予約のお時間となります。\n\n- 予約番号: ${reservation.code}\n- メニュー: ${reservation.service?.name ?? "未設定"}\n- 日時: ${start}\n- 担当: ${reservation.staff?.display_name ?? "未定"}\n\n店舗情報:\n- 店名: ${SALON_NAME}\n- 住所: ${SALON_ADDRESS.streetAddress}\n- 地図: ${SALON_MAP_URL}\n\nキャンセル規定:\n${CANCEL_POLICY_TEXT}\n`;

      const result = await sendEmailWithRetry({
        to: reservation.customer_email,
        subject,
        text: body,
        meta: { kind: "reminder", hours_before: hours, reservation_id: reservation.id },
      });

      if (result.ok) {
        await recordEvent("reservation.reminder.sent", {
          reservation_id: reservation.id,
          hours_before: hours,
          customer_email: reservation.customer_email,
        } as any);
      }

      await upsertNotificationLog(
        reservation.id,
        kind,
        addHours(new Date(reservation.start_at), -hours),
        result.ok ? new Date() : null,
      );
      if (result.ok) sent += 1;
    }
  }

  return { sent };
}

async function hasReminderBeenSent(reservationId: string, kind: ReminderKind) {
  const supabase = createSupabaseServiceRoleClient() as any;
  const { data, error } = await supabase
    .from("reservation_notifications")
    .select("id, sent_at")
    .eq("reservation_id", reservationId)
    .eq("kind", kind)
    .limit(1);
  if (error) throw error;
  type NotificationRow = Database["public"]["Tables"]["reservation_notifications"]["Row"];
  const rows = (data ?? []) as Pick<NotificationRow, "id" | "sent_at">[];
  if (rows.length === 0) {
    return false;
  }
  return Boolean(rows[0]?.sent_at);
}

async function upsertNotificationLog(
  reservationId: string,
  kind: ReminderKind,
  scheduledAt: Date,
  sentAt: Date | null,
) {
  const supabase = createSupabaseServiceRoleClient() as any;
  const { error } = await supabase.from("reservation_notifications").upsert(
    {
      reservation_id: reservationId,
      kind,
      scheduled_at: scheduledAt.toISOString(),
      sent_at: sentAt ? sentAt.toISOString() : null,
    },
    { onConflict: "reservation_id,kind" },
  );

  if (error) {
    console.error("Failed to upsert reservation notification log", error);
  }
}
