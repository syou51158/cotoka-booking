import { NextResponse } from "next/server";
import { env, getEnvHealth } from "@/lib/env";

// ヘルスチェックは常に200で ok/missing を返します（ガードレール適用外）

export async function GET() {
  const health = getEnvHealth();
  const missing: string[] = [];
  if (!env.SUPABASE_URL || env.SUPABASE_URL.length === 0)
    missing.push("SUPABASE_URL");
  if (!health.haveAnonKey) missing.push("SUPABASE_ANON_KEY");
  if (!health.haveServiceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.SITE_URL || env.SITE_URL.length === 0) missing.push("SITE_URL");

  const ok = missing.length === 0;

  return NextResponse.json({ ok, missing, health });
}
