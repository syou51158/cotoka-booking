import { NextResponse } from "next/server";
import { getReservationById } from "@/server/reservations";
import { getServiceById } from "@/server/services";
import { makeIcs } from "@/server/ics";
import { getBusinessProfile } from "@/server/settings";

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
    const profile = await getBusinessProfile();
    const siteName = profile.salon_name;
    const addressLine =
      profile.address_ja ?? profile.address_en ?? profile.address_zh ?? "";
    const websiteUrl = profile.website_url ?? undefined;
    const title = `${siteName} - ${service?.name ?? "ご予約"}`;
    const descriptionLines = [
      `${reservation.customer_name} 様`,
      `${siteName} のご予約が確定しました。`,
      "烏丸御池駅直結、エレベーターを降りて右後ろの704号室までお越しください。",
      websiteUrl ?? "",
    ];

    const ics = makeIcs({
      title,
      start: reservation.start_at,
      end: reservation.end_at,
      location: addressLine,
      description: descriptionLines.join("\n"),
      organizer: { name: siteName, email: profile.email_from },
      url: websiteUrl,
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
