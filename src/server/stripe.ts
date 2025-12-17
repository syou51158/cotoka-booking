import Stripe from "stripe";
import { DEFAULT_LOCALE, SITE_NAME } from "@/lib/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { recordEvent } from "./events";
import { markReservationPaid } from "./reservations";
import { sendReservationConfirmationEmail } from "./notifications";
import { resolveBaseUrl } from "@/lib/base-url";
import type { Database } from "@/types/database";

let stripeClient: Stripe | null = null;

export { getStripe };

function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    // Use library default pinned API version for stability
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getStripeClient() {
  return getStripe();
}

type EventPayload = Database["public"]["Tables"]["events"]["Insert"]["payload"];

function toJsonPayload(value: unknown): EventPayload {
  // Stripe.Event はシリアライズ可能なプレーンオブジェクトだが、
  // 型上は unknown -> Json への変換が必要なため、JSON を経由して整形する。
  try {
    return JSON.parse(JSON.stringify(value)) as EventPayload;
  } catch {
    // シリアライズ不可の場合は簡易メッセージで記録する
    return { message: "Non-serializable payload" } as EventPayload;
  }
}

export async function createCheckoutSessionForReservation(
  reservationId: string,
  req: Request,
  overrideBaseUrl?: string,
) {
  const client = createSupabaseServiceRoleClient();
  console.log("[stripe] reservation fetch start", { reservationId });
  const withTimeout = async <T>(p: Promise<T>, ms = 12000) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new Error(`DB timeout after ${ms}ms`));
      }, ms);
      p.then((v) => {
        clearTimeout(t);
        resolve(v);
      }).catch((e) => {
        clearTimeout(t);
        reject(e);
      });
    });
  // Supabase のクエリビルダーは PromiseLike を実装しているが、型互換性の都合で明示的に any として扱う
  const response = await withTimeout<any>(
    client
      .from("reservations")
      .select(
        "*, service:service_id(name, price_jpy, currency, requires_prepayment)",
      )
      .eq("id", reservationId)
      .maybeSingle() as any,
    12000,
  );
  const data = response?.data as any;
  const error = response?.error as any;
  console.log("[stripe] reservation fetch done", {
    ok: !error,
    hasData: !!data,
  });

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

  // 既存のチェックアウトセッションがあれば再利用して即時にURLを返却する
  if (data.stripe_checkout_session) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        String(data.stripe_checkout_session),
      );
      if (existing?.url) {
        console.log("[stripe] reuse checkout session", {
          sessionId: existing.id,
          hasUrl: !!existing.url,
        });
        // 既存セッションのURLをそのまま返却
        return { data: { url: existing.url } } as const;
      }
    } catch (e) {
      console.warn("[stripe] failed to retrieve existing session", e);
      // 続行して新規作成を試みる
    }
  }

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
  console.log("[stripe] resolveBaseUrl start");
  const resolved = await resolveBaseUrl(req);
  console.log("[stripe] resolveBaseUrl done", resolved);
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
  // キャンセル時は確認ページへ戻す（サービスIDを含むルーティングに合わせる）
  const cancelUrl = `${base}/${locale}/booking/${encodeURIComponent(
    data.service_id ?? "",
  )}/confirm?rid=${encodeURIComponent(data.id)}&from=stripe-cancel`;

  // セッション作成の前後をイベント記録して、原因特定しやすくする
  // 非同期で記録し、APIレスポンスをブロックしない
  recordEvent("stripe.checkout.create.start", {
    reservation_id: data.id,
  }).catch(() => {});

  const withTimeoutStripe = async <T>(p: Promise<T>, ms = 12000) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new Error(`Stripe checkout create timeout after ${ms}ms`));
      }, ms);
      p.then((v) => {
        clearTimeout(t);
        resolve(v);
      }).catch((e) => {
        clearTimeout(t);
        reject(e);
      });
    });

  console.log("[stripe] checkout.sessions.create start", {
    successUrl,
    cancelUrl,
  });
  let session: Stripe.Checkout.Session;
  try {
    session = await withTimeoutStripe(
      stripe.checkout.sessions.create({
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
              name: data.service?.name ?? `${SITE_NAME} Reservation`,
            },
            },
          },
        ],
      }),
      12000,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[stripe] checkout.sessions.create failed", message);
    recordEvent("stripe.checkout.create.failed", {
      reservation_id: data.id,
      error: message,
    }).catch(() => {});
    return {
      error: {
        code: "STRIPE_CREATE_FAILED",
        message,
      },
    } as const;
  }
  console.log("[stripe] checkout.sessions.create done", {
    sessionId: session.id,
    hasUrl: !!session.url,
  });

  // 記録は非同期で行い、Stripe応答の返却を優先
  recordEvent("stripe.checkout.create.success", {
    reservation_id: data.id,
    stripe_checkout_session: session.id,
  }).catch(() => {});

  // DB更新は非同期で行い、応答をブロックしない
  // Postgrest の戻り値は PromiseLike で catch が無いため、
  // onRejected を第二引数の then に渡してエラーを処理する
  client
    .from("reservations")
    .update({
      stripe_checkout_session: session.id,
      stripe_payment_intent: session.payment_intent
        ? String(session.payment_intent)
        : null,
      payment_option: "prepay",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .then(
      () => {},
      (e: unknown) =>
        console.warn("Failed to update reservation with Stripe session", e),
    );

  return { data: { url: session.url!, id: session.id } } as const;
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
    event = stripe.webhooks.constructEvent(
      payload,
      signature ?? "",
      webhookSecret,
    );
  } catch (err) {
    await recordEvent("stripe.webhook_error", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }

  await recordEvent(event.type, toJsonPayload(event));

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservationId;
    if (reservationId) {
      const client = createSupabaseServiceRoleClient();
      const { data: row } = await client
        .from("reservations")
        .select("id, status, code")
        .eq("id", reservationId)
        .maybeSingle();

      if (row && (row.status === "paid" || row.status === "confirmed")) {
        await recordEvent("reservation_paid_webhook_noop", {
          reservation_id: reservationId,
          stripe_checkout_session: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
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
        });
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
              : (session.payment_intent?.id ?? null),
        });
      }
    }
  }

  return event;
}
