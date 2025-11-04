import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  NOTIFY_FROM_EMAIL,
} = process.env;

export function createSMTPTransport() {
  const port = Number(SMTP_PORT ?? 587);
  const secure = String(SMTP_SECURE ?? "false").toLowerCase() === "true"; // 587ならfalse
  const host = SMTP_HOST;
  const user = SMTP_USER;
  const pass = SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration missing: check SMTP_HOST/SMTP_USER/SMTP_PASS",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: user!, pass: pass! },
    requireTLS: !secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
}

export async function verifySMTP() {
  const t = createSMTPTransport();
  await t.verify();
  return true;
}

export function isSmtpConfigured(): boolean {
  const host = SMTP_HOST;
  const port = SMTP_PORT;
  const user = SMTP_USER;
  const pass = SMTP_PASS;
  return Boolean(host && port && user && pass);
}

export async function sendSmtp(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: string;
  from?: string;
}): Promise<{ id: string; provider: "smtp" | "dry_run" }> {
  const allowMocks = process.env.ALLOW_DEV_MOCKS === "true";
  const configured = isSmtpConfigured();

  // ドライラン: 開発モック許可 かつ SMTP未設定の場合のみ
  if (allowMocks && !configured) {
    const fakeId = `dry_run:${Date.now()}`;
    // 例外は投げず、成功扱いで返す
    return { id: fakeId, provider: "dry_run" };
  }

  // 通常SMTP送信
  const t = createSMTPTransport();
  const attachments = params.ics
    ? [
        {
          filename: "reservation.ics",
          content: params.ics,
          contentType: "text/calendar",
        },
      ]
    : undefined;

  const from = params.from || NOTIFY_FROM_EMAIL || SMTP_USER;
  if (!from) {
    throw new Error("NOTIFY_FROM_EMAIL or SMTP_USER must be configured");
  }

  const info = await t.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments,
  });
  return { id: info.messageId, provider: "smtp" };
}

// 互換関数（既存呼び出し元のため）。今後 sendSmtp を使用。
export async function sendMailSMTP(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: string;
  from?: string;
}) {
  const res = await sendSmtp(params);
  return { messageId: res.id };
}
