import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { sendReservationConfirmationEmail } from "@/server/notifications";
import type { SupportedLocale } from "@/lib/config";

type Body = {
  rid: string;
  locale?: SupportedLocale;
};

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as Body;
    const rid = json?.rid;
    const locale: SupportedLocale = (json?.locale as SupportedLocale) ?? "ja";

    if (!rid || typeof rid !== "string") {
      return NextResponse.json({ error: "rid is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("id, customer_email, locale, code")
      .eq("id", rid)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const email = (data as any)?.customer_email as string | null;
    if (!email) {
      return NextResponse.json(
        { error: "Reservation has no email" },
        { status: 400 },
      );
    }

    const loc: SupportedLocale =
      (data as any)?.locale === "en" || (data as any)?.locale === "zh"
        ? (data as any)?.locale
        : locale;

    // 既存の確認メール送信ロジックを再利用（Magic Link付き）
    await sendReservationConfirmationEmail(rid, loc);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
