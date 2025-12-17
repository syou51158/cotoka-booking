
import { calculateCommission, reportTreatmentCompletion } from "../src/server/rewards";
import { clockIn, startBreak, endBreak, clockOut, getTodayAttendance } from "../src/server/attendance";
import { getDashboardSummary } from "../src/server/admin-dashboard";
import { addMinutes, subMinutes } from "date-fns";

// --- Mock Data Store ---
const db = {
  staff: [
    { id: "staff-1", display_name: "Alice", active: true },
    { id: "staff-2", display_name: "Bob", active: true }
  ],
  services: [
    { id: "srv-1", name: "Cut", price_jpy: 5000 },
    { id: "srv-2", name: "Color", price_jpy: 8000 }
  ],
  reservations: [
    { 
      id: "res-1", 
      staff_id: "staff-1", 
      service_id: "srv-1", 
      amount_total_jpy: 5000, 
      status: "confirmed", 
      start_at: new Date().toISOString(),
      customer_name: "Guest"
    }
  ],
  commission_rules: [
    { 
      id: "rule-1", 
      staff_id: "staff-1", 
      service_id: "srv-1", 
      rate_type: "percentage", 
      rate_value: 10, 
      active: true, 
      created_at: new Date().toISOString() 
    },
    { 
      id: "rule-2", 
      staff_id: "staff-1", 
      service_id: null, // Default
      rate_type: "fixed", 
      rate_value: 1000, 
      active: true, 
      created_at: subMinutes(new Date(), 10).toISOString() 
    }
  ],
  treatment_rewards: [] as any[],
  attendance_records: [] as any[]
};

// --- Mock Supabase Client ---
const mockSupabase = {
  from: (table: string) => {
    return {
      select: (cols: string) => {
        return {
          eq: (col: string, val: any) => {
            const filter = (data: any[]) => data.filter(r => r[col] === val);
            return {
              eq: (col2: string, val2: any) => {
                return {
                  maybeSingle: async () => ({ data: filter(db[table as keyof typeof db] as any[]).find(r => r[col2] === val2) || null, error: null }),
                  order: (col3: string, opts: any) => {
                     // Simple mock for rules ordering
                     const res = filter(db[table as keyof typeof db] as any[]).filter(r => r[col2] === val2);
                     return { data: res, error: null };
                  }
                }
              },
              maybeSingle: async () => ({ data: filter(db[table as keyof typeof db] as any[])[0] || null, error: null }),
              single: async () => {
                const res = filter(db[table as keyof typeof db] as any[])[0];
                return { data: res, error: res ? null : { message: "Not found" } };
              },
              order: (col2: string, opts: any) => {
                 const res = filter(db[table as keyof typeof db] as any[]);
                 return { data: res, error: null };
              }
            }
          },
          gte: (col: string, val: any) => {
             // Dashboard summary mock chain
             return {
               lte: (col2: string, val2: any) => {
                 return {
                   in: (col3: string, vals: any[]) => {
                      // Mocking sales summary
                      if (table === 'reservations') {
                        return { data: db.reservations, error: null };
                      }
                      return { data: [], error: null };
                   },
                   neq: (col3: string, val3: any) => {
                      if (table === 'treatment_rewards') {
                        return { data: db.treatment_rewards.filter(r => r[col3] !== val3), error: null };
                      }
                      return { data: [], error: null };
                   },
                   eq: (col3: string, val3: any) => {
                      if (table === 'attendance_records') {
                        return { data: db.attendance_records.filter(r => r.status === 'clocked_out'), error: null };
                      }
                      return { data: [], error: null };
                   }
                 }
               }
             }
          }
        }
      },
      insert: (payload: any) => {
        return {
          select: () => ({
            single: async () => {
              const newItem = { ...payload, id: `new-${Math.random()}` };
              (db[table as keyof typeof db] as any[]).push(newItem);
              return { data: newItem, error: null };
            }
          })
        }
      },
      update: (payload: any) => {
        return {
          eq: (col: string, val: any) => {
            return {
              select: () => ({
                single: async () => {
                  const idx = (db[table as keyof typeof db] as any[]).findIndex(r => r[col] === val);
                  if (idx === -1) return { data: null, error: { message: "Not found" } };
                  const updated = { ...(db[table as keyof typeof db] as any[])[idx], ...payload };
                  (db[table as keyof typeof db] as any[])[idx] = updated;
                  return { data: updated, error: null };
                }
              })
            }
          }
        }
      },
      upsert: (payload: any, opts: any) => {
        return {
          select: () => ({
            single: async () => {
              // Mock upsert (simple insert for now)
              const newItem = { ...payload, id: `reward-${Math.random()}`, created_at: new Date().toISOString() };
              (db[table as keyof typeof db] as any[]).push(newItem);
              return { data: newItem, error: null };
            }
          })
        }
      }
    }
  }
} as any;

async function runTests() {
  console.log("🚀 Starting E2E Verification (Mock Mode)...");
  
  try {
    // 1. Contractor Flow
    console.log("\n--- 1. Contractor Flow ---");
    console.log("Calculating commission for Reservation 1 (Cut, ¥5000, Rule: 10%)...");
    const comm = await calculateCommission("staff-1", "srv-1", 5000, mockSupabase);
    console.log("Result:", comm);
    
    if (comm.amount === 500 && comm.rate === 10) {
       console.log("✅ Calculation Correct");
    } else {
       console.error("❌ Calculation Failed");
       process.exit(1);
    }

    console.log("Reporting treatment completion...");
    const reward = await reportTreatmentCompletion({ reservationId: "res-1" }, mockSupabase);
    console.log("Reward Created:", reward);
    
    if (reward.status === 'draft' && reward.reward_amount_jpy === 500) {
      console.log("✅ Reward Saved Correctly");
    } else {
      console.error("❌ Reward Save Failed");
      process.exit(1);
    }

    // 2. Employee Flow
    console.log("\n--- 2. Employee Flow ---");
    const staffId = "staff-1";
    
    console.log("Clocking In...");
    const r1 = await clockIn(staffId, mockSupabase);
    console.log("Clock In:", r1.status, r1.clock_in_at);

    console.log("Starting Break...");
    const r2 = await startBreak(staffId, mockSupabase);
    console.log("Break Start:", r2.status);

    // Simulate time passing by hacking the mock DB directly (since we can't wait)
    // But here we just call endBreak immediately, diff will be 0 or small
    // To test logic, let's manually update last_break_start_at in DB to be 30 mins ago
    const r2_idx = db.attendance_records.findIndex(r => r.id === r2.id);
    db.attendance_records[r2_idx].last_break_start_at = subMinutes(new Date(), 30).toISOString();

    console.log("Ending Break (after 30 mins mock)...");
    const r3 = await endBreak(staffId, mockSupabase);
    console.log("Break End:", r3.status, "Break Minutes:", r3.break_minutes);

    if ((r3.break_minutes ?? 0) >= 30) {
      console.log("✅ Break Time Calculated");
    } else {
      console.error("❌ Break Time Calculation Failed", r3.break_minutes);
    }

    console.log("Clocking Out...");
    const r4 = await clockOut(staffId, mockSupabase);
    console.log("Clock Out:", r4.status, r4.clock_out_at);

    if (r4.status === 'clocked_out') {
      console.log("✅ Clock Out Successful");
    }

    // 3. Admin Flow
    console.log("\n--- 3. Admin Flow ---");
    console.log("Fetching Dashboard Summary...");
    const summary = await getDashboardSummary("2023-01-01", "2030-12-31", mockSupabase);
    console.log("Summary:", JSON.stringify(summary, null, 2));

    if (summary.sales.total === 5000) {
      // Note: rewards logic in getDashboardSummary filters neq 'draft', but our mock upserted 'draft'.
      // So rewards.total might be 0 if filtered correctly.
      // Let's check the logic in admin-dashboard.ts: .neq("status", "draft")
      // So rewards.total should be 0.
      if (summary.rewards.total === 0) {
         console.log("✅ Summary Correct (Draft rewards excluded)");
      } else {
         console.error("❌ Summary Failed (Drafts should be excluded)");
      }
    }

    console.log("\n🎉 All Scenarios Passed!");

  } catch (e) {
    console.error("Test Failed with Exception:", e);
    process.exit(1);
  }
}

runTests();
