import { NextRequest, NextResponse } from "next/server";
import { sendEmailWithRetry } from "@/server/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, content } = body;

    if (!to || !subject || !content) {
      return NextResponse.json({
        error: "Missing required fields: to, subject, content"
      }, { status: 400 });
    }

    // テストメール送信
    const result = await sendEmailWithRetry({
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">テストメール</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${content}
          </div>
          <p style="color: #666; font-size: 14px;">
            このメールは Cotoka Booking システムのテスト送信です。
          </p>
        </div>
      `,
      meta: {
        event_type: "email_test",
        reservation_id: null,
      },
    });

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        emailId: result.emailId,
        attempt: result.attempt,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Failed to send test email",
        attempt: result.attempt,
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL;

  return NextResponse.json({
    message: "Test email endpoint",
    config: {
      hasResendKey: Boolean(resendApiKey && resendApiKey.length > 0),
      hasFromEmail: Boolean(fromEmail && fromEmail.length > 0),
      fromEmailMasked: fromEmail ? fromEmail.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
    },
    usage: {
      method: "POST",
      body: {
        to: "recipient@example.com",
        subject: "Test Subject",
        content: "Test message content"
      }
    }
  });
}