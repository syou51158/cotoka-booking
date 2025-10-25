import { NextResponse } from "next/server";
import { z } from "zod";
import { updateReservationContact } from "@/server/reservations";
import { recordEvent } from "@/server/events";

const schema = z
  .object({
    reservationId: z.string().uuid(),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(5).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    locale: z.string().optional().nullable(),
  })
  .refine((data) => data.email || data.phone, {
    message: "メールまたは電話番号のいずれかを入力してください",
    path: ["email"],
  });

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = schema.parse(payload);
    const updated = await updateReservationContact(parsed.reservationId, {
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      notes: parsed.notes ?? null,
      locale: parsed.locale ?? null,
    });
    await recordEvent("manage_reschedule", {
      reservation_id: parsed.reservationId,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Manage update failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
