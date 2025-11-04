import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { processReservationReminders } from "@/server/notifications";

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

  const window24Param = allowDev ? url.searchParams.get("window24m") : null;
  const window2Param = allowDev ? url.searchParams.get("window2m") : null;

  const windowMinutes: Partial<
    Record<"24h" | "2h", { before: number; after: number }>
  > = {};

  if (allowDev && window24Param) {
    const value = Math.abs(Number.parseInt(window24Param, 10));
    if (Number.isFinite(value) && value > 0) {
      windowMinutes["24h"] = { before: value, after: value };
    }
  }

  if (allowDev && window2Param) {
    const value = Math.abs(Number.parseInt(window2Param, 10));
    if (Number.isFinite(value) && value > 0) {
      windowMinutes["2h"] = { before: value, after: value };
    }
  }

  // Always allow when x-cron-secret matches, even in production
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
    console.log("Starting reminder processing...");
    const startTime = Date.now();

    const result = await processReservationReminders({
      referenceDate,
      windowMinutes,
    });

    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      sent_count: result.sent || 0,
      status: "success",
      reference_date: referenceDate?.toISOString(),
      window_minutes: windowMinutes,
    };

    console.log("Reminder processing completed:", JSON.stringify(logData));

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

    console.error("Reminder processing failed:", JSON.stringify(logData));
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
