import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const isStaging = env.SITE_URL?.includes("stg.") || env.SITE_URL?.includes("localhost");
  const body = isStaging
    ? "User-agent: *\nDisallow: /\n"
    : "User-agent: *\nAllow: /\n";
  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
