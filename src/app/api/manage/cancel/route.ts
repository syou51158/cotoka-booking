import { NextResponse } from "next/server";
import { z } from "zod";
import { customerCancelReservation } from "@/server/reservations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { renderCancellationEmail } from "@/lib/email-renderer";
import { sendEmailWithRetry } from "@/server/notifications";
import { getBusinessProfile } from "@/server/settings";
import { recordEvent } from "@/server/events";
import { checkEmailIdempotency } from "@/lib/idempotency";

const schema = z.object({
  reservationId: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { reservationId, reason } = schema.parse(json);

    // 予約キャンセル（顧客起点）
    const canceled = await customerCancelReservation(reservationId, reason);
    if (!canceled) {
      return NextResponse.json(
        { message: "キャンセルできません（対象が見つからない／状態不一致）" },
        { status: 400 },
      );
    }

    // キャンセルメール送信（メールアドレスがある場合のみ）
    try {
      const supabase = createSupabaseServiceRoleClient() as any;
      const { data: joined, error } = await supabase
        .from("reservations")
        .select(
          "*, service:service_id(name,duration_min), staff:staff_id(display_name,email)"
        )
        .eq("id", reservationId)
        .maybeSingle();
      if (error) throw error;

      const row = joined as any;
      const email = row?.customer_email as string | null;
      if (email) {
        // 冪等性チェック（重複送信防止）
        const idempotency = await checkEmailIdempotency(
          reservationId,
          "cancellation",
          15,
        );
        if (!idempotency.isAllowed) {
          await recordEvent("reservation.cancellation.skipped_duplicate", {
            reservation_id: reservationId,
            customer_email: email,
            lastSentAt: idempotency.lastSentAt ?? null,
            reason: idempotency.reason ?? "duplicate",
          }).catch(() => {});
        } else {
          const baseReservation = {
            id: row.id as string,
            customer_name: row.customer_name as string,
            customer_email: email,
            start_at: row.start_at as string,
            total_amount: (row as any).amount_total_jpy as number,
            status: row.status as string,
            code: row.code as string,
            notes: (row as any).notes ?? undefined,
            service: row.service
              ? { name: row.service.name as string, duration_min: (row.service.duration_min ?? 60) as number }
              : null,
            staff: row.staff
              ? { display_name: row.staff.display_name as string, email: (row.staff.email ?? "") as string }
              : null,
            hasPrepayment: ((row as any).payment_option === "prepay") || ((row as any).amount_total_jpy ?? 0) > 0,
          } as const;

          const locale: "ja" | "en" | "zh" =
            row.locale === "en" || row.locale === "zh" ? row.locale : "ja";

          const emailContent = await renderCancellationEmail(
            baseReservation,
            locale,
          );
          const profile = await getBusinessProfile();
          await sendEmailWithRetry({
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            meta: {
              kind: "cancellation",
              reservation_id: reservationId,
              locale,
            },
            from: profile.email_from,
          });

          await recordEvent("reservation.cancellation.sent", {
            reservation_id: reservationId,
            code: row.code as string,
            customer_email: email,
          }).catch(() => {});
        }
      }
    } catch (e) {
      // メール送信失敗はAPI成功の阻害要因にしない（キャンセルは成立）
      await recordEvent("reservation.cancellation.email_failed", {
        reservation_id: reservationId,
        error_message: e instanceof Error ? e.message : String(e),
      }).catch(() => {});
    }

    return NextResponse.json({ id: canceled.id, status: "canceled" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
