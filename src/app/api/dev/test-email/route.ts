import { NextRequest, NextResponse } from "next/server";
import { sendSmtp, isSmtpConfigured } from "@/server/email/smtp";
import { sendEmailWithRetry } from "@/server/notifications";
import { getBusinessProfile } from "@/server/settings";

const isDevAllowed = process.env.ALLOW_DEV_MOCKS === "true";

export async function GET(request: NextRequest) {
  if (!isDevAllowed) {
    return NextResponse.json(
      { ok: false, message: "Disabled in this environment" },
      { status: 403 },
    );
  }

  try {
    const url = new URL(request.url);
    const to = url.searchParams.get("to");
    const subject = url.searchParams.get("subject") || "Cotoka テストメール";
    const html = url.searchParams.get("html") || "ok";
    const profile = await getBusinessProfile();

    if (!to) {
      return NextResponse.json(
        { ok: false, error: "Missing 'to' parameter" },
        { status: 400 },
      );
    }

    const res = await sendSmtp({ to, subject, html, from: profile.email_from });
    return NextResponse.json(
      { ok: true, provider: res.provider, id: res.id, to },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // SMTPが構成されている場合は、本番環境でもPOSTのテスト送信を許可
  if (!isDevAllowed && !isSmtpConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Disabled in this environment" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { to, subject, html } = body;
    const profile = await getBusinessProfile();

    if (!to || !subject || !html) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required fields: to, subject, html",
        },
        { status: 400 },
      );
    }

    const result = await sendEmailWithRetry({
      to,
      subject,
      html,
      meta: { event_type: "email_test", reservation_id: null },
      from: profile.email_from,
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        provider: result.provider,
        id: result.emailId,
        to,
      });
    } else {
      return NextResponse.json(
        {
          ok: false,
          attempt: result.attempt,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
