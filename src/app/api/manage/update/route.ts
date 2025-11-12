import { NextResponse } from "next/server";
import { z } from "zod";
import { updateReservationContact } from "@/server/reservations";

const schema = z.object({
  reservationId: z.string().min(1),
  email: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  locale: z.union([z.string(), z.null()]).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { reservationId, email, phone, notes, locale } = schema.parse(json);

    const updated = await updateReservationContact(reservationId, {
      email: email ?? null,
      phone: phone ?? null,
      notes: notes ?? null,
      locale: locale ?? null,
    });

    if (!updated) {
      return NextResponse.json(
        { message: "予約が見つかりません" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
