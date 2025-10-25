import { NextResponse } from "next/server";
import { settleReservationPayment } from "@/server/admin";

export async function GET(request: Request) {
  if (process.env.ALLOW_DEV_MOCKS !== "true") {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const reservationId = url.searchParams.get("rid");
  const methodParam = url.searchParams.get("method") ?? "cash";
  const amountParam = url.searchParams.get("amount");

  if (!reservationId) {
    return NextResponse.json({ message: "rid is required" }, { status: 400 });
  }

  const amount = amountParam != null ? Number(amountParam) : undefined;
  const method = methodParam === "card" ? "card" : methodParam === "other" ? "other" : "cash";

  try {
    const updated = await settleReservationPayment(reservationId, method as any, amount);
    return NextResponse.json({ status: "ok", reservation: updated });
  } catch (error) {
    console.error("Dev settle payment failed", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json({ message }, { status });
  }
}