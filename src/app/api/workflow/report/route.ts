import { NextRequest, NextResponse } from "next/server";
import { reportTreatmentCompletion } from "@/server/rewards";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * Report Treatment Workflow
 * POST /api/workflow/report
 */
export async function POST(request: NextRequest) {
    try {
        // For MVP Phase 1, we protect this with Admin Auth or similar.
        // In Phase 3 (Staff App), we will need to verify staff user session.
        // For now, let's reuse verifyAdmin or allow if development.
        await verifyAdmin(request);

        const body = await request.json();
        const { reservationId } = body;

        if (!reservationId) {
            return NextResponse.json(
                { error: "reservationId is required" },
                { status: 400 }
            );
        }

        const result = await reportTreatmentCompletion(reservationId);
        return NextResponse.json(result);
    } catch (err: any) {
        console.error("[POST] /api/workflow/report", err);
        return NextResponse.json(
            { error: err.message || "Failed to report treatment" },
            { status: 500 }
        );
    }
}
