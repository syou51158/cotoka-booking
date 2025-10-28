import { sendMailSMTP } from "@/server/email/smtp";
import { formatInTimeZone } from "date-fns-tz";
import { addHours, addMinutes, subMinutes } from "date-fns";
import { SITE_NAME, SITE_URL, TIMEZONE, SALON_NAME, SALON_ADDRESS, SALON_PHONE, SALON_MAP_URL, CANCEL_POLICY_TEXT } from "@/lib/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { recordEvent } from "./events";
import { renderConfirmationEmail, renderReminderEmail, renderCancellationEmail } from "@/lib/email-renderer";
import { getBusinessProfile } from "@/server/settings";
import { getDictionary } from "@/i18n/dictionaries";
import { checkEmailIdempotency } from "@/lib/idempotency";

const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL ?? "";

export async function sendEmailWithRetry(
  params: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
    meta?: Record<string, unknown>;
    from?: string;
  },
  maxAttempts = 3,
): Promise<{ ok: boolean; attempt: number; emailId?: string }> {
  // Extract ICS from attachments (base64) if present
  const icsBase64 = params.attachments?.find((a) => (a.contentType ?? "") === "text/calendar")?.content;
  const ics = icsBase64 ? Buffer.from(icsBase64, "base64").toString("utf-8") : undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { messageId } = await sendMailSMTP({
        to: params.to,
        subject: params.subject,
        html: params.html ?? (params.text ? `<pre>${params.text}</pre>` : ""),
        text: params.text,
        ics,
        from: params.from,
      });

      await recordEvent("email_sent", {
        ...(params.meta ?? {}),
        to: params.to,
        subject: params.subject,
        provider: "smtp",
        attempt,
        dry_run: false,
        messageId,
      });

      return { ok: true, attempt, emailId: messageId };
    } catch (error) {
      await recordEvent("email_send_failed", {
        ...(params.meta ?? {}),
        to: params.to,
        subject: params.subject,
        provider: "smtp",
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

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

export async function sendReservationConfirmationEmail(reservationId: string, locale: "ja" | "en" | "zh" = 'ja') {
  const profile = await getBusinessProfile();
  const supabase = createSupabaseServiceRoleClient();
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

  // 重複送信防止の冪等性チェック（15分ウィンドウ）
  const idempotency = await checkEmailIdempotency(reservationId, "confirmation", 15);
  if (!idempotency.isAllowed) {
    await recordEvent("reservation.confirmation.skipped_duplicate", {
      reservation_id: reservationId,
      customer_email: joined.customer_email,
      lastSentAt: idempotency.lastSentAt ?? null,
      reason: idempotency.reason ?? "duplicate"
    });
    return;
  }

  // レンダラーが期待する形（BaseReservation）に正規化し、total_amount を確実に渡す
  const baseReservation = {
    id: joined.id,
    customer_name: joined.customer_name,
    customer_email: joined.customer_email,
    start_at: joined.start_at,
    total_amount: (joined as any).amount_total_jpy,
    status: joined.status,
    code: joined.code,
    notes: joined.notes ?? undefined,
    service: joined.service
      ? { name: joined.service.name, duration_min: joined.service.duration_min ?? 60 }
      : null,
    staff: joined.staff
      ? { display_name: joined.staff.display_name, email: joined.staff.email ?? "" }
      : null,
  };

  // 新しいテンプレートシステムを使用
  const emailContent = await renderConfirmationEmail(baseReservation, locale);

  const result = await sendEmailWithRetry({
    to: joined.customer_email,
    subject: emailContent.subject,
    html: emailContent.html,
    attachments: emailContent.attachments,
    meta: { kind: "confirmation", reservation_id: reservationId, code: joined.code, locale },
    from: profile.email_from,
  });

  if (result.ok) {
    await recordEvent("reservation.confirmation.sent", {
      reservation_id: reservationId,
      customer_email: joined.customer_email,
      locale,
    });
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
  const profile = await getBusinessProfile();
  const supabase = createSupabaseServiceRoleClient();
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

      // 予約のロケールを取得（デフォルトは日本語）
      const locale: "ja" | "en" | "zh" = (reservation.locale === 'en' || reservation.locale === 'zh') ? reservation.locale : 'ja';
      
      // BaseReservation に正規化して、total_amount を渡す
      const baseReservation = {
        id: reservation.id,
        customer_name: reservation.customer_name,
        customer_email: reservation.customer_email,
        start_at: reservation.start_at,
        total_amount: (reservation as any).amount_total_jpy,
        status: reservation.status,
        code: reservation.code,
        notes: reservation.notes ?? undefined,
        service: reservation.service ? { name: reservation.service.name, duration_min: 60 } : null,
        staff: reservation.staff ? { display_name: reservation.staff.display_name, email: "" } : null,
      };
      
      // 新しいテンプレートシステムを使用
      const emailContent = await renderReminderEmail(baseReservation, kind, locale);

      const result = await sendEmailWithRetry({
        to: reservation.customer_email,
        subject: emailContent.subject,
        html: emailContent.html,
        attachments: emailContent.attachments,
        meta: { kind: "reminder", hours_before: hours, reservation_id: reservation.id, locale },
        from: profile.email_from,
      });

      if (result.ok) {
        await recordEvent("reservation.reminder.sent", {
        reservation_id: reservation.id,
        hours_before: hours,
        customer_email: reservation.customer_email,
      });
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
