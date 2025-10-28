import { getStripe } from "@/server/stripe";
import { markReservationPaid } from "@/server/reservations";
import { sendReservationConfirmationEmail } from "@/server/notifications";
import { recordEvent } from "@/server/events";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { resolveBaseUrl } from "@/lib/base-url";
import { HttpError, json, assertEnv } from "@/lib/http";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rid = url.searchParams.get("rid");
  const csId = url.searchParams.get("cs_id");

  if (!rid || !csId) {
    return json({ message: "missing rid/cs_id" }, 400);
  }

  const base = await resolveBaseUrl(request);
  const csMasked = csId.length > 4 ? `${csId.slice(0, 2)}****${csId.slice(-4)}` : csId;

  // 事前チェック：既に paid の場合はNOP（confirmed は続行して支払い確定へ）
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data: row } = await supabase
      .from("reservations")
      .select("id, status, code")
      .eq("id", rid)
      .maybeSingle();

    if (row && ((row as any).status === "paid")) {
      await recordEvent("payment_confirm_attempt", {
        reservation_id: rid,
        result: "noop",
        url_base: base,
        cs_id_masked: csMasked,
      });
      return NextResponse.json({ status: "ok", message: "already_paid" });
    }
  } catch (e) {
    // 非致命：事前チェック失敗は続行
  }

  try {
    assertEnv(["STRIPE_SECRET_KEY"]);

    let paid = false;
    let amountTotal: number | null = null;
    let paymentIntentId: string | null = null;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(csId);

    if (
      session.payment_status === "paid" ||
      (session as any).status === "complete"
    ) {
      paid = true;
      amountTotal = session.amount_total ?? null;
      paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      const reservationIdFromMeta = session.metadata?.reservationId;
      if (reservationIdFromMeta && reservationIdFromMeta !== rid) {
        await recordEvent("payment_confirm_attempt", {
          reservation_id: rid,
          result: "failed",
          reason: "session_meta_mismatch",
          url_base: base,
          cs_id_masked: csMasked,
        });
        throw new HttpError(400, "invalid_session");
      }
    }

    if (!paid) {
      await recordEvent("payment_confirm_attempt", {
        reservation_id: rid,
        result: "failed",
        reason: "not_paid",
        url_base: base,
        cs_id_masked: csMasked,
      });
      return json({ message: "not_paid" }, 409);
    }

    await markReservationPaid(rid, {
      status: "paid",
      stripe_checkout_session: csId,
      stripe_payment_intent: paymentIntentId,
      paid_amount_jpy: amountTotal ?? undefined,
      payment_method: "card_online",
      payment_collected_at: new Date().toISOString(),
      payment_option: "prepay",
    } as any);

    await sendReservationConfirmationEmail(rid);

    await recordEvent("reservation_paid", {
      reservation_id: rid,
      paid_amount_jpy: amountTotal,
      payment_method: "card_online",
      payment_collected_at: new Date().toISOString(),
      stripe_checkout_session: csId,
      stripe_payment_intent: paymentIntentId,
    });

    await recordEvent("payment_confirm_attempt", {
      reservation_id: rid,
      result: "success",
      url_base: base,
      cs_id_masked: csMasked,
    });

    return json({ status: "ok" }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await recordEvent("stripe.confirm_error", { message, reservation_id: rid, url_base: base });
    if (e instanceof HttpError) {
      return json({ message: e.message }, e.status);
    }
    // Stripeの検証失敗などは500に正規化
    return json({ message: "internal_error" }, 500);
  }
}