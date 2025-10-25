import { NextResponse } from "next/server";
import { verifyAndHandleWebhook } from "@/server/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") ?? undefined;
    await verifyAndHandleWebhook(rawBody, signature);
    return new NextResponse("ok");
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return new NextResponse("invalid", { status: 400 });
  }
}
