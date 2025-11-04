import { NextResponse } from "next/server";
import { getBusinessProfile } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getBusinessProfile({ preferCache: false });
    const payload = {
      salon_name: profile.salon_name,
      address_ja: profile.address_ja ?? null,
      address_en: profile.address_en ?? null,
      address_zh: profile.address_zh ?? null,
      phone: profile.phone ?? null,
      website_url: profile.website_url ?? null,
      map_url: profile.map_url ?? null,
      timezone: profile.timezone,
      default_locale: profile.default_locale,
      currency: profile.currency,
      updated_at: profile.updated_at,
    };
    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "failed_to_fetch_settings" },
      { status: 500 },
    );
  }
}
