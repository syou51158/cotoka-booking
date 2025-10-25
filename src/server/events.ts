import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

export async function recordEvent(
  type: string,
  payload: Database["public"]["Tables"]["events"]["Insert"]["payload"],
) {
  const client = createSupabaseServiceRoleClient() as any;
  const { error } = await client.from("events").insert({ type, payload });

  if (error) {
    console.error("Failed to record event", error);
  }
}
