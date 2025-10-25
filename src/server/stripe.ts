import Stripe from "stripe";
import { DEFAULT_LOCALE } from "@/lib/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { recordEvent } from "./events";
import { markReservationPaid } from "./reservations";
import { sendReservationConfirmationEmail } from "./notifications";
import { resolveBaseUrl } from "@/lib/base-url";

let stripeClient: Stripe | null = null;

export { getStripe };

function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripeClient = new Stripe(key, { apiVersion: "2025-09-30.clover" });
  }
  return stripeClient;
}

export function getStripeClient() {
  return getStripe();
}

export async function createCheckoutSessionForReservation(
  reservationId: string,
  req: Request,
  overrideBaseUrl?: string,
) {
  const client = createSupabaseServiceRoleClient() as any;
  const { data, error } = await client
    .from("reservations")
    .select(
      "*, service:service_id(name, price_jpy, currency, requires_prepayment)",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      error: {
        code: "RESERVATION_NOT_FOUND",
        message: "予約が見つかりません",
      },
    } as const;
  }

  if (!["pending", "unpaid", "confirmed"].includes(data.status)) {
    return {
      error: {
        code: "INVALID_STATUS",
        message: "この予約は決済できません",
      },
    } as const;
  }

  const stripe = getStripe();

  // locale: 予約行が優先、無ければヘッダから推定（ja/en）、最後に既定値
  const acceptLanguage = req.headers.get("accept-language") ?? "";
  const headerLocale = /\bja\b/i.test(acceptLanguage)
    ? "ja"
    : /\ben\b/i.test(acceptLanguage)
    ? "en"
    : undefined;
  const locale =
    (typeof data.locale === "string" && data.locale.length > 0
      ? data.locale
      : headerLocale) || DEFAULT_LOCALE;

  // base URL 解決（override は allowlist に一致しない場合は無視）
  const resolved = await resolveBaseUrl(req);
  let base = resolved;
  if (overrideBaseUrl) {
    try {
      const u = new URL(overrideBaseUrl);
      const allow = (process.env.ALLOWED_BASE_HOSTS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!allow.length || allow.includes(u.host)) {
        base = overrideBaseUrl;
      }
    } catch {
      // ignore invalid override
    }
  }
  base = base.replace(/\/$/, "");

  const successUrl = `${base}/${locale}/success?rid=${encodeURIComponent(
    data.id,
  )}&cs_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}/${locale}/booking`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: data.customer_email ?? undefined,
    locale: (locale as Stripe.Checkout.SessionCreateParams.Locale) ?? "ja",
    metadata: {
      reservationId: data.id,
      reservationCode: data.code,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "JPY",
          unit_amount: data.amount_total_jpy,
          product_data: {
            name: data.service?.name ?? "Cotoka Reservation",
          },
        },
      },
    ],
  });

  await client
    .from("reservations")
    .update({
      stripe_checkout_session: session.id,
      stripe_payment_intent: session.payment_intent
        ? String(session.payment_intent)
        : null,
      payment_option: "prepay",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  return { data: { url: session.url! } } as const;
}

export async function verifyAndHandleWebhook(
  payload: string,
  signature?: string,
) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature ?? "", webhookSecret);
  } catch (err) {
    await recordEvent("stripe.webhook_error", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }

  await recordEvent(event.type, event as any);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservationId;
    if (reservationId) {
      const client = createSupabaseServiceRoleClient() as any;
      const { data: row } = await client
        .from("reservations")
        .select("id, status, code")
        .eq("id", reservationId)
        .maybeSingle();

      if (row && (row as any).status === "paid" || (row as any).status === "confirmed") {
        await recordEvent("reservation_paid_webhook_noop", {
          reservation_id: reservationId,
          stripe_checkout_session: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
        });
      } else {
        await markReservationPaid(reservationId, {
          status: "paid",
          stripe_checkout_session: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
          paid_amount_jpy: session.amount_total ?? undefined,
          payment_method: "card_online",
          payment_collected_at: new Date().toISOString(),
          payment_option: "prepay",
        } as any);
        await sendReservationConfirmationEmail(reservationId);
        await recordEvent("reservation_paid", {
          reservation_id: reservationId,
          paid_amount_jpy: session.amount_total ?? null,
          payment_method: "card_online",
          payment_collected_at: new Date().toISOString(),
          stripe_checkout_session: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
        });
      }
    }
  }

  return event;
}
