import { NextResponse } from "next/server";
import { getBusinessProfile, updateBusinessProfile } from "@/server/settings";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const profile = await getBusinessProfile({ preferCache: false });
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "failed_to_fetch_settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const input = await request.json();
    // バリデーション
    const required = [
      "salon_name",
      "email_from",
      "timezone",
      "default_locale",
    ] as const;
    for (const key of required) {
      if (!input[key]) {
        return NextResponse.json(
          { error: `validation_failed:${key}` },
          { status: 400 },
        );
      }
    }

    if (!["ja", "en", "zh"].includes(input.default_locale)) {
      return NextResponse.json(
        { error: "validation_failed:default_locale" },
        { status: 400 },
      );
    }

    const saved = await updateBusinessProfile(input, { email: "admin" });
    return NextResponse.json(saved, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "failed_to_update_settings" },
      { status: 500 },
    );
  }
}
