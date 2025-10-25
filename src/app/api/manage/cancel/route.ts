import { NextResponse } from "next/server";
import { z } from "zod";
import { customerCancelReservation } from "@/server/reservations";
import { recordEvent } from "@/server/events";

const schema = z.object({
  reservationId: z.string().uuid(),
  reason: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { reservationId, reason } = schema.parse(payload);
    const canceled = await customerCancelReservation(
      reservationId,
      reason ?? undefined,
    );
    if (!canceled) {
      return NextResponse.json(
        { message: "キャンセル対象がありません" },
        { status: 400 },
      );
    }
    await recordEvent("manage_cancel", {
      reservation_id: reservationId,
      reason: reason ?? null,
    });
    return NextResponse.json(canceled);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Manage cancel failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
