import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPendingReservation,
  markReservationPaid,
} from "@/server/reservations";
import { createCheckoutSessionForReservation } from "@/server/stripe";
import { sendReservationConfirmationEmail } from "@/server/notifications";
import { recordEvent } from "@/server/events";
import { resolveBaseUrl } from "@/lib/base-url";

const requestSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  start: z.string().min(1),
  end: z.string().optional().nullable(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().nullable(),
  customerPhone: z.string().min(5).optional().nullable(),
  locale: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  paymentOption: z.enum(["pay_in_store", "prepay"]),
  agreements: z.object({
    terms: z.boolean(),
    cancel: z.boolean(),
    privacy: z.boolean(),
  }),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.parse(json);

    if (
      !parsed.agreements.terms ||
      !parsed.agreements.cancel ||
      !parsed.agreements.privacy
    ) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "同意が必要です" },
        { status: 400 },
      );
    }

    if (!parsed.customerEmail && !parsed.customerPhone) {
      return NextResponse.json(
        { code: "CONTACT_REQUIRED", message: "メールまたは電話番号が必要です" },
        { status: 400 },
      );
    }

    const result = await createPendingReservation({
      serviceId: parsed.serviceId,
      staffId: parsed.staffId,
      roomId: parsed.roomId,
      start: parsed.start,
      end: parsed.end ?? undefined,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      customerPhone: parsed.customerPhone,
      locale: parsed.locale ?? undefined,
      notes: parsed.notes,
      paymentOption: parsed.paymentOption,
    });

    if ("error" in result) {
      const status = result.error.code === "SLOT_TAKEN" ? 409 : 400;
      return NextResponse.json(result.error, { status });
    }

    const data = result.data;

    const base = await resolveBaseUrl(request);

    if (parsed.paymentOption === "pay_in_store") {
      await markReservationPaid(data!.id, { status: "confirmed", payment_option: "pay_in_store" } as any);
      try {
        await sendReservationConfirmationEmail(data!.id);
        await recordEvent("reservation.confirmed.pay_in_store", {
          reservation_id: data!.id,
        });
      } catch (e) {
        console.warn("Confirmation email dispatch failed", e);
      }
      const locale = parsed.locale ?? "ja";
      const nextUrl = `/${locale}/success?rid=${encodeURIComponent(data!.id)}`;
      const res = NextResponse.json({ rid: data!.id, id: data!.id, code: data!.code, nextUrl }, { status: 200 });
      res.headers.set("X-Base-Url", base);
      return res;
    }

    try {
      const checkout = await createCheckoutSessionForReservation(
        data.id,
        request,
        base,
      );
      if ("error" in checkout) {
        const res = NextResponse.json(checkout.error, { status: 400 });
        res.headers.set("X-Base-Url", base);
        return res;
      }
      const res = NextResponse.json(
        { rid: data.id, id: data.id, code: data.code, checkoutUrl: checkout.data.url },
        { status: 200 },
      );
      res.headers.set("X-Base-Url", base);
      return res;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Stripe処理に失敗しました";
      const res = NextResponse.json(
        { code: "STRIPE_ERROR", message },
        { status: 400 },
      );
      res.headers.set("X-Base-Url", base);
      return res;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Reservation create failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
