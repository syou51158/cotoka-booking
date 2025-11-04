import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { cancelExpiredPendingReservations } from "@/server/reservations";

/**
 * 期限切れペンディング予約の自動キャンセルCronエンドポイント
 *
 * 本番環境での使用例:
 * curl -X POST http://localhost:3000/api/cron/pending-expired \
 *   -H "x-cron-secret: your_production_secret"
 *
 * 開発環境での使用例（ALLOW_DEV_MOCKS=true時）:
 * curl -X POST http://localhost:3000/api/cron/pending-expired
 *
 * 開発環境でのテスト（時間シフト付き）:
 * curl -X POST "http://localhost:3000/api/cron/pending-expired?shiftMinutes=20"
 */

async function handleRequest(request: Request) {
  const allowDev = process.env.ALLOW_DEV_MOCKS === "true";
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);

  const shiftParam = url.searchParams.get("shiftMinutes");
  const shiftMinutes =
    allowDev && shiftParam ? Number.parseInt(shiftParam, 10) : undefined;
  const referenceDate =
    allowDev && Number.isFinite(shiftMinutes)
      ? addMinutes(new Date(), Number(shiftMinutes))
      : undefined;

  if (!allowDev) {
    if (!secret) {
      return NextResponse.json(
        { message: "CRON_SECRET not configured" },
        { status: 500 },
      );
    }

    const header = request.headers.get("x-cron-secret");
    if (header !== secret) {
      return NextResponse.json({ message: "unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("Starting pending-expired cancellation...");
    const startTime = Date.now();

    const result = await cancelExpiredPendingReservations({ referenceDate });

    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      canceled_count: result.canceled || 0,
      status: "success",
      reference_date: referenceDate?.toISOString(),
    };

    console.log(
      "Pending-expired cancellation completed:",
      JSON.stringify(logData),
    );

    return NextResponse.json({
      status: "ok",
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const logData = {
      timestamp: new Date().toISOString(),
      status: "error",
      error: errorMessage,
    };

    console.error(
      "Pending-expired cancellation failed:",
      JSON.stringify(logData),
    );
    return NextResponse.json(
      {
        message: "error",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function GET(request: Request) {
  // Allow GET for Cloud Scheduler with secret header
  return handleRequest(request);
}
