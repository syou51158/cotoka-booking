import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getRealtimeStaffStatus } from "@/server/admin-dashboard";

export async function GET(req: NextRequest) {
    const auth = await verifyAdminAuth(req);
    if (!auth.success) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await getRealtimeStaffStatus();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json(
            { error: e.message || "Failed to fetch realtime status" },
            { status: 500 }
        );
    }
}
