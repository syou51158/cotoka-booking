import { NextRequest, NextResponse } from "next/server";
import { sendMailSMTP } from "@/server/email/smtp";
import { sendEmailWithRetry } from "@/server/notifications";
import { getBusinessProfile } from "@/server/settings";

const isDevAllowed = process.env.ALLOW_DEV_MOCKS === "true";

export async function GET(request: NextRequest) {
  if (!isDevAllowed) {
    return NextResponse.json({ ok: false, message: "Disabled in this environment" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const to = url.searchParams.get("to");
    const host = process.env.SMTP_HOST || null;
    const user = process.env.SMTP_USER || null;
    const profile = await getBusinessProfile();

    if (to) {
      const { messageId } = await sendMailSMTP({
        to,
        subject: "Cotoka SMTP テストメール",
        html: `<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n<h2 style=\"color: #333;\">SMTPテスト</h2>\n<p style=\"color: #555;\">このメールは Cotoka Booking のSMTPテスト送信です。</p>\n<p style=\"margin-top:12px;color:#777;font-size:12px;\">provider: smtp / host: ${host ?? "-"} / user: ${user ?? "-"}</p>\n</div>`,
        from: profile.email_from,
      });
      return NextResponse.json({ ok: true, provider: "smtp", messageId });
    }

    return NextResponse.json({
      ok: true,
      provider: "smtp",
      config: { host, user },
      usage: {
        method: "GET",
        example: "/api/dev/test-email?to=recipient@example.com",
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      provider: "smtp",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isDevAllowed) {
    return NextResponse.json({ ok: false, message: "Disabled in this environment" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { to, subject, content } = body;
    const profile = await getBusinessProfile();

    if (!to || !subject || !content) {
      return NextResponse.json({
        ok: false,
        error: "Missing required fields: to, subject, content",
      }, { status: 400 });
    }

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
      meta: { event_type: "email_test", reservation_id: null },
      from: profile.email_from,
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        provider: "smtp",
        emailId: result.emailId,
        attempt: result.attempt,
      });
    } else {
      return NextResponse.json({
        ok: false,
        provider: "smtp",
        attempt: result.attempt,
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      ok: false,
      provider: "smtp",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}