import { NextRequest, NextResponse } from "next/server";
import { getEffectiveStaff } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getEffectiveStaff(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Verify ownership before delete (RLS does this too, but good to be explicit/safe)
    const { error } = await auth.supabase
      .from("sales_transactions")
      .delete()
      .eq("id", id)
      .eq("staff_id", auth.staff.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete transaction" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
