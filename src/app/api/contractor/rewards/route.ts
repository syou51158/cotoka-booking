import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getStaffByUserId } from "@/server/staff";
import { getStaffRewards, reportTreatmentCompletion } from "@/server/rewards";

async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await getStaffByUserId(user.id);
  if (!staff) {
    return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
  }

  try {
    const data = await getStaffRewards(staff.id);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch rewards" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await getStaffByUserId(user.id);
  if (!staff) {
    return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { reservationId, totalSales, note } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Invalid input: reservationId is required" },
        { status: 400 }
      );
    }

    // totalSales は任意（なければ予約情報の金額を使う）
    const data = await reportTreatmentCompletion({
      reservationId,
      totalSales: typeof totalSales === 'number' ? totalSales : undefined,
      note,
    });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "Failed to save reward report" },
      { status: 500 }
    );
  }
}
