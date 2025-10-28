import { NextRequest, NextResponse } from "next/server";
import { verifySMTP } from "@/server/email/smtp";

// ヘルスチェックは常に200で ok/missing を返します（ガードレール適用外）

export async function GET(_request: NextRequest) {
  try {
    const host = process.env.SMTP_HOST || null;
    const user = process.env.SMTP_USER || null;

    if (!host || !user) {
      return NextResponse.json({
        ok: false,
        provider: "smtp",
        message: "SMTP not fully configured",
        host,
        user,
      }, { status: 200 });
    }

    await verifySMTP();

    return NextResponse.json({
      ok: true,
      provider: "smtp",
      host,
      user,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      provider: "smtp",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}