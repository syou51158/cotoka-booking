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
    const result = await processReservationReminders({
      referenceDate,
      windowMinutes,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    console.error("Reminder job failed", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function GET(request: Request) {
  // Allow GET for Cloud Scheduler with secret header
  return handleRequest(request);
}
