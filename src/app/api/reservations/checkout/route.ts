import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { createCheckoutSessionForReservation } from "@/server/stripe";
import { resolveBaseUrl } from "@/lib/base-url";

const schema = z.object({ rid: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { rid } = schema.parse(json);
    const base = await resolveBaseUrl(request);

    const supabase = createSupabaseServiceRoleClient() as any;
    const { data, error } = await supabase
      .from("reservations")
      .select(
        "id, status, code, pending_expires_at, customer_phone, email_verified_at",
      )
      .eq("id", rid)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { code: "RESERVATION_NOT_FOUND", message: "予約が見つかりません" },
        { status: 404 },
      );
    }

    const phoneOk = !!(data as any).customer_phone;
    const emailVerified = !!(data as any).email_verified_at;
    if (!phoneOk && !emailVerified) {
      const res = NextResponse.json(
        {
          code: "EMAIL_NOT_VERIFIED",
          message:
            "メール確認が完了していません。メールのリンクから確認してください。",
          rid: rid,
          verificationRequired: true,
        },
        { status: 409 },
      );
      res.headers.set("X-Base-Url", base);
      return res;
    }

    const checkout = await createCheckoutSessionForReservation(
      rid,
      request,
      base,
    );
    if ("error" in checkout) {
      const res = NextResponse.json(checkout.error, { status: 400 });
      res.headers.set("X-Base-Url", base);
      return res;
    }

    const res = NextResponse.json(
      {
        rid,
        id: rid,
        reservationId: rid,
        code: (data as any).code,
        pendingExpiresAt: (data as any).pending_expires_at,
        checkoutUrl: checkout.data.url,
        checkoutSessionId: checkout.data.id,
      },
      { status: 200 },
    );
    res.headers.set("X-Base-Url", base);
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
