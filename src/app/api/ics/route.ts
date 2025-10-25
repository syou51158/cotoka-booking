import { NextResponse } from "next/server";
import { getReservationById } from "@/server/reservations";
import { getServiceById } from "@/server/services";
import { makeIcs } from "@/server/ics";
import { SALON_LOCATION_TEXT, SITE_NAME, SITE_URL } from "@/lib/config";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reservationId = url.searchParams.get("rid");

    if (!reservationId) {
      return NextResponse.json({ message: "rid is required" }, { status: 400 });
    }

    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 },
      );
    }

    const service = reservation.service_id
      ? await getServiceById(reservation.service_id)
      : null;
    const title = `${SITE_NAME} - ${service?.name ?? "ご予約"}`;
    const descriptionLines = [
      `${reservation.customer_name} 様`,
      "Cotoka Relax & Beauty SPA のご予約が確定しました。",
      "烏丸御池駅直結、エレベーターを降りて右後ろの704号室までお越しください。",
      SITE_URL,
    ];

    const ics = makeIcs({
      title,
      start: reservation.start_at,
      end: reservation.end_at,
      location: SALON_LOCATION_TEXT,
      description: descriptionLines.join("\n"),
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${reservation.code ?? reservationId}.ics"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate ICS file", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
