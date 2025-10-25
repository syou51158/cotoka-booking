import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.NOTIFY_FROM_EMAIL;

    // 基本設定チェック
    const config = {
      hasResendKey: Boolean(resendApiKey && resendApiKey.length > 0),
      hasFromEmail: Boolean(fromEmail && fromEmail.length > 0),
      fromEmailMasked: fromEmail ? fromEmail.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
    };

    if (!config.hasResendKey || !config.hasFromEmail) {
      return NextResponse.json({
        status: "warning",
        message: "Email provider not fully configured",
        config,
        canSend: false,
      }, { status: 200 });
    }

    // Resendクライアントの接続テスト（実際には送信しない）
    try {
      const resend = new Resend(resendApiKey);
      
      // Resend APIの到達性をテスト（ドメイン一覧取得で確認）
      // 実際のメール送信は行わない
      await resend.domains.list();
      
      return NextResponse.json({
        status: "ok",
        message: "Email provider is configured and reachable",
        config: {
          ...config,
          canSend: true,
        },
      });
    } catch (error) {
      return NextResponse.json({
        status: "error",
        message: "Email provider configuration error",
        config: {
          ...config,
          canSend: false,
        },
        error: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Health check failed",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}