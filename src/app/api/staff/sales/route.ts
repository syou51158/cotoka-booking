import { NextRequest, NextResponse } from "next/server";
import { getEffectiveStaff } from "@/lib/api-auth";

export const runtime = "nodejs";

type SalesEntryStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "paid_locked";

type SalesEntry = {
  id: string;
  date: string;
  sales_amount: number;
  status: SalesEntryStatus;
  note: string | null;
};

function parseLimit(input: string | null, fallback: number) {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.floor(n);
  if (v <= 0) return fallback;
  return Math.min(v, 50);
}

export async function GET(req: NextRequest) {
  const auth = await getEffectiveStaff(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const recentLimit = parseLimit(url.searchParams.get("recentLimit"), 5);

    if (from && to) {
      const { data, error } = await auth.supabase
        .from("sales_entries")
        .select("id,date,sales_amount,status,note")
        .eq("staff_id", auth.staff.id)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true });

      if (error) {
        return NextResponse.json(
          { error: error.message || "Failed to fetch entries" },
          { status: 400 },
        );
      }

      return NextResponse.json({ entries: (data ?? []) as SalesEntry[] });
    }

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const [{ data: entry, error: entryError }, { data: recent, error: recentError }] =
      await Promise.all([
        auth.supabase
          .from("sales_entries")
          .select("id,date,sales_amount,status,note")
          .eq("staff_id", auth.staff.id)
          .eq("date", date)
          .maybeSingle(),
        auth.supabase
          .from("sales_entries")
          .select("id,date,sales_amount,status,note")
          .eq("staff_id", auth.staff.id)
          .order("date", { ascending: false })
          .limit(recentLimit),
      ]);

    if (entryError) {
      return NextResponse.json(
        { error: entryError.message || "Failed to fetch entry" },
        { status: 400 },
      );
    }
    if (recentError) {
      return NextResponse.json(
        { error: recentError.message || "Failed to fetch recent entries" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      entry: (entry ?? null) as SalesEntry | null,
      recentEntries: (recent ?? []) as SalesEntry[],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 },
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
    const note = typeof body?.note === "string" ? body.note : "";
    const salesAmountRaw = body?.sales_amount;
    const salesAmount =
      typeof salesAmountRaw === "number"
        ? salesAmountRaw
        : typeof salesAmountRaw === "string"
          ? Number(salesAmountRaw)
          : NaN;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    if (!Number.isFinite(salesAmount) || salesAmount < 0) {
      return NextResponse.json(
        { error: "sales_amount must be a non-negative number" },
        { status: 400 },
      );
    }

    const payload = {
      staff_id: auth.staff.id,
      date,
      sales_amount: Math.floor(salesAmount),
      note: note.length > 0 ? note : null,
      status: "submitted" as const,
    };

    const { data, error } = await auth.supabase
      .from("sales_entries")
      .upsert(payload, { onConflict: "staff_id,date" })
      .select("id,date,sales_amount,status,note")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to save entry" },
        { status: 400 },
      );
    }

    return NextResponse.json({ entry: data as SalesEntry });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
