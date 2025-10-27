import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { sendReservationConfirmationEmail, sendEmailWithRetry } from "@/server/notifications";
import { renderCancellationEmail, renderReminderEmail } from "@/lib/email-renderer";
import { recordEvent } from "@/server/events";
import { checkRateLimit, checkEmailResendRateLimit } from '@/lib/rate-limit';
import { checkEmailIdempotency } from '@/lib/idempotency';



export async function POST(request: NextRequest) {
  // 本番環境での追加セキュリティチェック
  if (process.env.NODE_ENV === 'production') {
    // 本番環境では管理者メールドメインを制限
    const allowedDomains = process.env.ADMIN_EMAIL_DOMAINS?.split(',') || [];
    if (allowedDomains.length === 0) {
      console.error('ADMIN_EMAIL_DOMAINS not configured in production');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
  }

  // 管理者認証チェック
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 本番環境での管理者ドメイン検証
  if (process.env.NODE_ENV === 'production') {
    const allowedDomains = process.env.ADMIN_EMAIL_DOMAINS?.split(',') || [];
    const userDomain = authResult.user?.email?.split('@')[1];
    if (!userDomain || !allowedDomains.includes(userDomain)) {
      console.warn(`Unauthorized admin access attempt: ${authResult.user?.email}`);
      return NextResponse.json({ error: 'Unauthorized domain' }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { reservationId, kind } = body;

    if (!reservationId || !kind) {
      return NextResponse.json(
        { error: "reservationId and kind are required" },
        { status: 400 }
      );
    }

    if (!["confirmation", "24h", "2h", "cancel"].includes(kind)) {
      return NextResponse.json(
        { error: "Invalid kind. Must be one of: confirmation, 24h, 2h, cancel" },
        { status: 400 }
      );
    }

    // IP制限チェック（1時間に10回まで）
    const ipRateLimit = checkRateLimit(request, {
      windowMs: 60 * 60 * 1000, // 1時間
      maxRequests: 10
    });
    
    if (!ipRateLimit.success) {
      const remainingMinutes = Math.ceil((ipRateLimit.resetTime - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { 
          error: `レート制限に達しました。${remainingMinutes}分後に再試行してください`,
          retryAfter: ipRateLimit.resetTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((ipRateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': ipRateLimit.limit.toString(),
            'X-RateLimit-Remaining': ipRateLimit.remaining.toString(),
            'X-RateLimit-Reset': ipRateLimit.resetTime.toString()
          }
        }
      );
    }

    // メール再送制限チェック（15分間に1回まで）
    const emailRateLimit = checkEmailResendRateLimit(reservationId, kind);
    
    if (!emailRateLimit.success) {
      const remainingMinutes = Math.ceil((emailRateLimit.resetTime - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { 
          error: `この予約のメール再送は${remainingMinutes}分後に可能です`,
          retryAfter: emailRateLimit.resetTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((emailRateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // 冪等性チェック（重複送信防止）
    const idempotencyCheck = await checkEmailIdempotency(reservationId, kind, 15);
    
    if (!idempotencyCheck.isAllowed) {
      return NextResponse.json(
        { 
          error: idempotencyCheck.reason || '重複送信が検出されました',
          lastSentAt: idempotencyCheck.lastSentAt
        },
        { status: 409 } // Conflict
      );
    }

    // 予約情報を取得
    const supabase = createSupabaseServiceRoleClient();
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("*, service:service_id(name), staff:staff_id(display_name)")
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // 予約のロケールを取得（デフォルトは日本語）
    const locale = reservation.locale || 'ja';



    try {
      // 種別に応じてメール送信
      switch (kind) {
        case "confirmation":
          await sendReservationConfirmationEmail(reservationId, locale);
          break;
        case "cancel":
          {
            const emailContent = await renderCancellationEmail({
              ...reservation,
              hasPrepayment: reservation.total_amount > 0
            }, locale);
            
            await sendEmailWithRetry({
              to: reservation.customer_email,
              subject: emailContent.subject,
              html: emailContent.html,
              meta: { kind: "cancellation", reservation_id: reservation.id, locale },
            });
          }
          break;
        case "24h":
          {
            const emailContent = await renderReminderEmail(reservation, '24h', locale);
            
            await sendEmailWithRetry({
              to: reservation.customer_email,
              subject: emailContent.subject,
              html: emailContent.html,
              attachments: emailContent.attachments,
              meta: { kind: "reminder", hours_before: 24, reservation_id: reservation.id, locale },
            });
          }
          break;
        case "2h":
          {
            const emailContent = await renderReminderEmail(reservation, '2h', locale);
            
            await sendEmailWithRetry({
              to: reservation.customer_email,
              subject: emailContent.subject,
              html: emailContent.html,
              attachments: emailContent.attachments,
              meta: { kind: "reminder", hours_before: 2, reservation_id: reservation.id, locale },
            });
          }
          break;
        default:
          throw new Error(`Unsupported email kind: ${kind}`);
      }

      // 成功時のイベント記録
      await recordEvent("email_sent", {
        reservation_id: reservationId,
        kind,
        source: "admin_resend",
        customer_email: reservation.customer_email,
        locale,
        provider: "resend"
      });

      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        kind,
        reservationId
      });

    } catch (emailError) {
      console.error("Failed to send email:", emailError);

      // 失敗時のイベント記録
      await recordEvent("email_send_failed", {
        reservation_id: reservationId,
        kind,
        source: "admin_resend",
        customer_email: reservation.customer_email,
        locale,
        error: emailError instanceof Error ? emailError.message : "Unknown error"
      });

      return NextResponse.json(
        { error: "Failed to send email", details: emailError instanceof Error ? emailError.message : "Unknown error" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Resend API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}