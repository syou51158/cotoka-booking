import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupReservationByCode } from "@/server/reservations";

const schema = z.object({
  code: z.string().min(1),
  contact: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { code, contact } = schema.parse(json);

    const row = await lookupReservationByCode(code, contact);
    if (!row) {
      return NextResponse.json(
        { message: "予約が見つかりません" },
        { status: 404 },
      );
    }

    const payload = {
      id: (row as any).id as string,
      code: (row as any).code as string,
      status: (row as any).status as string,
      amount_total_jpy: (row as any).amount_total_jpy as number | undefined,
      customer_name: (row as any).customer_name as string,
      customer_email: (row as any).customer_email ?? null,
      customer_phone: (row as any).customer_phone ?? null,
      notes: (row as any).notes ?? null,
      start_at: (row as any).start_at as string,
      end_at: (row as any).end_at as string,
      service: {
        name: (row as any)?.service?.name ?? null,
      },
      staff: {
        display_name: (row as any)?.staff?.display_name ?? null,
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
