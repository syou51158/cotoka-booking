import { NextResponse } from "next/server";
import { markReservationPaid } from "@/server/reservations";
import { recordEvent } from "@/server/events";
import { sendReservationConfirmationEmail } from "@/server/notifications";

export async function GET(request: Request) {
  if (process.env.ALLOW_DEV_MOCKS !== "true") {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const reservationId = url.searchParams.get("rid");

  if (!reservationId) {
    return NextResponse.json({ message: "rid is required" }, { status: 400 });
  }

  try {
    const reservation = await markReservationPaid(reservationId, {
      status: "paid",
    });
    if (!reservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 },
      );
    }

    // 予約確定メール送信（開発ではdry-runまたはResendにより送信）
    await sendReservationConfirmationEmail(reservationId);

    await recordEvent("reservation.paid.dev_mock", {
      reservation_id: reservationId,
    });

    return NextResponse.json({ status: "ok", reservation });
  } catch (error) {
    console.error("Mock checkout complete failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
