"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface SalesEntryWithStaff {
    id: string;
    date: string;
    sales_amount: number;
    status: string;
    note: string | null;
    staff: {
        display_name: string;
    };
}

export interface MonthlyStats {
    totalSales: number;
    approvedSales: number;
    pendingCount: number;
    staffStats: {
        staff_id: string;
        staff_name: string;
        total_sales: number;
        entry_count: number;
    }[];
}

export async function getPendingEntries(): Promise<SalesEntryWithStaff[]> {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
        .from('sales_entries')
        .select(`
            *,
            staff ( display_name )
        `)
        .eq('status', 'submitted')
        .order('date', { ascending: true });

    if (error) throw new Error(error.message);
    
    // Flatten structure for easier usage if needed, or keep as is
    return data as unknown as SalesEntryWithStaff[];
}

export async function updateEntryStatus(id: string, status: 'approved' | 'rejected') {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) throw new Error("Unauthorized");

    // 1. Update status
    const { error } = await supabaseAdmin
        .from('sales_entries')
        .update({ 
            status, 
            approved_at: status === 'approved' ? new Date().toISOString() : null 
        })
        .eq('id', id);

    if (error) throw new Error(error.message);

    // 2. Log event
    await supabaseAdmin
        .from('sales_entry_events')
        .insert({
            sales_entry_id: id,
            event_type: status === 'approved' ? 'approve' : 'reject',
            // actor_id: null, // Admin
            payload: { action_by: 'admin_panel' }
        });

    revalidatePath('/admin/sales');
}

export async function getMonthlySummary(monthStr: string): Promise<MonthlyStats> {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) throw new Error("Unauthorized");

    const date = new Date(monthStr + "-01");
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end = format(endOfMonth(date), 'yyyy-MM-dd');

    // Get all entries for the month
    const { data, error } = await supabaseAdmin
        .from('sales_entries')
        .select(`
            sales_amount,
            status,
            staff_id,
            staff ( display_name )
        `)
        .gte('date', start)
        .lte('date', end);

    if (error) throw new Error(error.message);

    const stats: MonthlyStats = {
        totalSales: 0,
        approvedSales: 0,
        pendingCount: 0,
        staffStats: []
    };

    const staffMap = new Map<string, { name: string; sales: number; count: number }>();

    data?.forEach((entry: any) => {
        stats.totalSales += entry.sales_amount;
        if (entry.status === 'approved' || entry.status === 'paid_locked') {
            stats.approvedSales += entry.sales_amount;
        }
        if (entry.status === 'submitted') {
            stats.pendingCount++;
        }

        const sid = entry.staff_id;
        const sname = entry.staff?.display_name || 'Unknown';
        
        if (!staffMap.has(sid)) {
            staffMap.set(sid, { name: sname, sales: 0, count: 0 });
        }
        const s = staffMap.get(sid)!;
        s.sales += entry.sales_amount;
        s.count += 1;
    });

    stats.staffStats = Array.from(staffMap.entries()).map(([id, val]) => ({
        staff_id: id,
        staff_name: val.name,
        total_sales: val.sales,
        entry_count: val.count
    }));

    return stats;
}

export async function closeMonth(monthStr: string) {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) throw new Error("Unauthorized");

    // Check if already closed
    const { data: existing } = await supabaseAdmin
        .from('payroll_runs')
        .select('id')
        .eq('month', monthStr)
        .maybeSingle();

    if (existing) throw new Error("Month already closed");

    // Create payroll run
    const { data: run, error: runError } = await supabaseAdmin
        .from('payroll_runs')
        .insert({ month: monthStr, status: 'confirmed' })
        .select()
        .single();

    if (runError || !run) throw runError || new Error("Failed to create payroll run");

    // Lock entries (optional, but good practice)
    // Update sales_entries status to 'paid_locked' for approved entries
    const date = new Date(monthStr + "-01");
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end = format(endOfMonth(date), 'yyyy-MM-dd');

    await supabaseAdmin
        .from('sales_entries')
        .update({ status: 'paid_locked' })
        .eq('status', 'approved')
        .gte('date', start)
        .lte('date', end);
        
    // Generate payroll items (This logic depends on commission rates)
    // Fetch aggregated sales per staff
    const summary = await getMonthlySummary(monthStr);

    for (const staffStat of summary.staffStats) {
        // Fetch commission rules from commission_rules table
        // We look for a global rule (service_id is NULL) for the staff
        const { data: rule } = await supabaseAdmin
            .from('commission_rules')
            .select('rate_value, rate_type')
            .eq('staff_id', staffStat.staff_id)
            .is('service_id', null)
            .eq('active', true)
            .maybeSingle();

        let commission = 0;
        let rate = 0;
        let note = "No active commission rule found";

        if (rule) {
            if (rule.rate_type === 'percentage') {
                rate = Number(rule.rate_value);
                commission = Math.floor(staffStat.total_sales * (rate / 100));
                note = `Calculated at ${rate}%`;
            } else {
                // Fixed amount (assuming one-time monthly for global rule)
                commission = Number(rule.rate_value);
                note = `Fixed amount`;
            }
        }

        // Create a payroll item record
        await supabaseAdmin.from('payroll_items').insert({
            payroll_run_id: run.id,
            staff_id: staffStat.staff_id,
            amount: commission,
            details: {
                total_sales: staffStat.total_sales,
                commission_rate: rate,
                rule_type: rule?.rate_type,
                note: note
            }
        });
    }

    revalidatePath('/admin/sales');
    return { success: true };
}
