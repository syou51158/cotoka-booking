import { NextRequest, NextResponse } from "next/server";
import { getEffectiveStaff } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await getEffectiveStaff(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("sales_transactions")
      .select("*")
      .eq("staff_id", auth.staff.id)
      .eq("date", date)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch transactions" },
        { status: 400 }
      );
    }

    return NextResponse.json({ transactions: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getEffectiveStaff(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const date = typeof body?.date === "string" ? body.date : "";
    const serviceName = typeof body?.service_name === "string" ? body.service_name : "";
    const customerGender = typeof body?.customer_gender === "string" ? body.customer_gender : null;
    const notes = typeof body?.notes === "string" ? body.notes : null;
    const amountRaw = body?.amount;
    const amount =
      typeof amountRaw === "number"
        ? amountRaw
        : typeof amountRaw === "string"
          ? Number(amountRaw)
          : NaN;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    if (!serviceName) {
      return NextResponse.json({ error: "service_name is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: "amount must be a non-negative number" },
        { status: 400 }
      );
    }

    const payload = {
      staff_id: auth.staff.id,
      date,
      service_name: serviceName,
      amount: Math.floor(amount),
      customer_gender: customerGender,
      notes: notes,
    };

    const { data, error } = await auth.supabase
      .from("sales_transactions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to save transaction" },
        { status: 400 }
      );
    }

    return NextResponse.json({ transaction: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
