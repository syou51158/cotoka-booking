import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { normalizePhone } from "@/server/reservations";
import { recordEvent } from "@/server/events";

const schema = z.object({
  code: z.string().min(6),
  contact: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { code, contact } = schema.parse(payload);
    const supabase = createSupabaseServiceRoleClient();
    const normalizedEmail = contact.includes("@")
      ? contact.trim().toLowerCase()
      : null;
    const normalizedPhoneRaw = normalizePhone(contact);
    const normalizedPhone =
      normalizedPhoneRaw.length > 0 ? normalizedPhoneRaw : null;

    if (!normalizedEmail && !normalizedPhone) {
      return NextResponse.json(
        { message: "予約が見つかりませんでした" },
        { status: 404 },
      );
    }

    let query = supabase
      .from("reservations")
      .select(
        "id, code, status, amount_total_jpy, customer_name, customer_email, customer_phone, notes, start_at, end_at, service:service_id(name,requires_prepayment), staff:staff_id(display_name)",
      )
      .eq("code", code)
      .in("status", ["unpaid", "pending", "confirmed", "paid"]);

    if (normalizedEmail && normalizedPhone) {
      query = query.or(
        `customer_email.eq.${normalizedEmail},customer_phone.eq.${normalizedPhone}`,
      );
    } else if (normalizedEmail) {
      query = query.eq("customer_email", normalizedEmail);
    } else if (normalizedPhone) {
      query = query.eq("customer_phone", normalizedPhone);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { message: "予約が見つかりませんでした" },
        { status: 404 },
      );
    }

    await recordEvent("manage_lookup", {
      reservation_id: data.id,
      code: data.code,
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Manage lookup failed", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
