import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env, projectRefMismatch } from "./env";

const url = env.SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.warn(
    "SUPABASE_URL is not set. API calls will fail until it is configured.",
  );
}

if (projectRefMismatch && process.env.NODE_ENV === "production") {
  throw new Error("Supabase projectRef mismatch (production)");
}

export function createSupabaseBrowserClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase anon configuration missing");
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function createSupabaseServiceRoleClient() {
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role configuration missing");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
