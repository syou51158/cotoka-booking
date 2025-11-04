import fs from "fs";
import path from "path";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { sendReservationConfirmationEmail } from "@/server/notifications";

function loadEnvFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {}
}

// Load .env.local and .env if present (for standalone script execution)
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

async function main() {
  const ridArg = process.argv.find((a) => a.startsWith("rid="))?.split("=")[1];
  const localeArg = process.argv
    .find((a) => a.startsWith("locale="))
    ?.split("=")[1] as "ja" | "en" | "zh" | undefined;
  const supabase = createSupabaseServiceRoleClient();

  let rid = ridArg;
  let locale: "ja" | "en" | "zh" = localeArg ?? "ja";

  if (!rid) {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, status, customer_email, locale")
      .is("customer_email", null)
      .not("customer_email", "is", null)
      .in("status", ["paid", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = (data ?? [])[0] as any;
    if (!row) {
      throw new Error(
        "No paid/confirmed reservations with customer_email found.",
      );
    }
    rid = row.id as string;
    locale = row.locale === "en" || row.locale === "zh" ? row.locale : "ja";
  }

  if (!rid) throw new Error("Reservation id not available");
  console.log(
    `[send-confirmation] Sending confirmation email for rid=${rid} locale=${locale}`,
  );
  await sendReservationConfirmationEmail(rid, locale);
  console.log(`[send-confirmation] Done`);
}

main().catch((e) => {
  console.error("[send-confirmation] Failed", e);
  process.exit(1);
});
