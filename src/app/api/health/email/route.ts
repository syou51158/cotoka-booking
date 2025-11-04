import { NextRequest, NextResponse } from "next/server";
import { verifySMTP, isSmtpConfigured } from "@/server/email/smtp";

// ヘルスチェックは常に200で ok/missing を返します（ガードレール適用外）

export async function GET(_request: NextRequest) {
  const allowMocks = process.env.ALLOW_DEV_MOCKS === "true";
  const smtpConfigured = isSmtpConfigured();
  const host = process.env.SMTP_HOST || null;
  const user = process.env.SMTP_USER || null;
  const from = process.env.NOTIFY_FROM_EMAIL || null;

  // ヘルスは常に200
  try {
    if (!smtpConfigured) {
      return NextResponse.json(
        {
          ok: false,
          provider: "dry_run",
          configured: { smtp: false, from },
          note: "ALLOW_DEV_MOCKS=true かつ SMTP未設定時は dry_run",
        },
        { status: 200 },
      );
    }

    // 設定が揃っている場合は検証
    await verifySMTP();
    return NextResponse.json(
      {
        ok: true,
        provider: "smtp",
        configured: { smtp: true, from },
        note: allowMocks
          ? "ALLOW_DEV_MOCKS=true かつ SMTP未設定時は dry_run"
          : undefined,
      },
      { status: 200 },
    );
  } catch (error) {
    // 検証失敗でも200で返す（理由明記）
    return NextResponse.json(
      {
        ok: false,
        provider: "smtp",
        configured: { smtp: smtpConfigured, from },
        error: error instanceof Error ? error.message : String(error),
        note: "検証失敗: transporter.verify()",
      },
      { status: 200 },
    );
  }
}
