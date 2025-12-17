import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { reportTreatmentCompletion, calculateCommission } from "@/server/rewards";
import { clockIn, startBreak, endBreak, clockOut, getTodayAttendance } from "@/server/attendance";
import { getDashboardSummary } from "@/server/admin-dashboard";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function seedIfMissing(supabase: ReturnType<typeof createClient<Database>>) {
  const { data: staff } = await supabase.from("staff").select("id").eq("display_name", "E2E Staff").maybeSingle();
  let staffId = staff?.id;
  if (!staffId) {
    const { data: inserted } = await supabase
      .from("staff")
      .insert({ display_name: "E2E Staff", active: true })
      .select("id")
      .single();
    staffId = inserted!.id;
  }

  const { data: service } = await supabase.from("services").select("id").eq("name", "E2E Service").maybeSingle();
  let serviceId = service?.id;
  if (!serviceId) {
    const { data: inserted } = await supabase
      .from("services")
      .insert({ name: "E2E Service", duration_min: 60, price_jpy: 10000, active: true, requires_prepayment: false })
      .select("id")
      .single();
    serviceId = inserted!.id;
  }

  const { data: rule } = await supabase
    .from("commission_rules")
    .select("id")
    .eq("staff_id", staffId!)
    .eq("service_id", serviceId!)
    .eq("active", true)
    .maybeSingle();
  if (!rule) {
    await supabase
      .from("commission_rules")
      .insert({ staff_id: staffId!, service_id: serviceId!, rate_type: "percentage", rate_value: 10, active: true });
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id")
    .eq("code", "E2E-RES-1")
    .maybeSingle();
  if (!reservation) {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    await supabase
      .from("reservations")
      .insert({
        code: "E2E-RES-1",
        customer_name: "E2E Customer",
        amount_total_jpy: 10000,
        status: "confirmed" as any,
        service_id: serviceId!,
        staff_id: staffId!,
        start_at: now.toISOString(),
        end_at: end.toISOString(),
      });
  }

  return { staffId: staffId!, serviceId: serviceId! };
}

async function main() {
  const url = envOrThrow("SUPABASE_URL");
  const serviceKey = envOrThrow("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient<Database>(url, serviceKey, { db: { schema: "public" } });

  console.log("Seeding test data if missing...");
  const { staffId, serviceId } = await seedIfMissing(supabase);

  console.log("Commission calculation test...");
  const c = await calculateCommission(staffId, serviceId, 10000, supabase);
  console.log("Commission:", c);
  if (!(c.rate === 10 && c.amount === 1000)) throw new Error("Commission calc failed");

  console.log("Reporting treatment completion...");
  const reward = await reportTreatmentCompletion({ reservationId: (await supabase.from("reservations").select("id").eq("code", "E2E-RES-1").single()).data!.id }, supabase);
  console.log("Reward:", reward);
  if (reward.status !== "draft") throw new Error("Reward not saved as draft");

  console.log("Attendance flow...");
  const a1 = await clockIn(staffId, supabase);
  console.log("Clock in:", a1.status);
  const a2 = await startBreak(staffId, supabase);
  console.log("Break start:", a2.status);
  // Simulate break 1 minute for quick test
  await endBreak(staffId, supabase);
  const a4 = await clockOut(staffId, supabase);
  console.log("Clock out:", a4.status);

  console.log("Dashboard summary...");
  const from = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const to = new Date(new Date().getFullYear(), 11, 31).toISOString();
  const summary = await getDashboardSummary(from, to, supabase);
  console.log("Summary:", summary);

  console.log("E2E (real DB) OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

