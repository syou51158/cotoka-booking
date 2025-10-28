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
    throw new Error("SMTP configuration missing: check SMTP_HOST/SMTP_USER/SMTP_PASS");
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

export async function sendMailSMTP(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: string;
  from?: string;
}) {
  const t = createSMTPTransport();

  const attachments = params.ics
    ? [{ filename: "reservation.ics", content: params.ics, contentType: "text/calendar" }]
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
  return { messageId: info.messageId };
}