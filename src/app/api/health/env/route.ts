import { NextResponse } from "next/server";
import { getEnvHealth } from "@/lib/env";

export async function GET() {
  const health = getEnvHealth();
  return NextResponse.json(health, { status: 200 });
}