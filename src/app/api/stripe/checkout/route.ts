import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSessionForReservation } from "@/server/stripe";
import { resolveBaseUrl } from "@/lib/base-url";

const requestSchema = z.object({
  reservationId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { reservationId } = requestSchema.parse(json);

    const base = await resolveBaseUrl(request);

    const result = await createCheckoutSessionForReservation(
      reservationId,
      request,
      base,
    );

    if ("error" in result) {
      const res = NextResponse.json(result.error, { status: 400 });
      res.headers.set("X-Base-Url", base);
      return res;
    }

    const res = NextResponse.json(result.data);
    res.headers.set("X-Base-Url", base);
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Checkout session create failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
