import { getSupabaseAdmin } from "@/lib/supabase";

export interface CustomerProfile {
    id: string; // Use email as ID for aggregation for now
    email: string;
    name: string;
    phone: string | null;
    total_visits: number;
    total_spent: number;
    last_visit: string; // ISO date
}

export async function getCustomers(query?: string): Promise<CustomerProfile[]> {
    const supabase = getSupabaseAdmin();

    // Fetch all reservations.
    // In a real production app, we would use a specialized DB view or a dedicated table.
    // For now, we aggregate in memory or use a complex query.
    // Given standard Supabase/PostgREST limitations, pulling relevant fields is safest for small scale.

    const { data: reservations, error } = await supabase
        .from("reservations")
        .select("customer_email, customer_name, customer_phone, amount_total_jpy, start_at, status")
        .neq("status", "canceled");

    if (error || !reservations) {
        console.error("Error fetching customers:", error);
        return [];
    }

    // Aggregate by email
    const customerMap = new Map<string, CustomerProfile>();

    for (const r of reservations) {
        if (!r.customer_email) continue;

        const email = r.customer_email;
        const current = customerMap.get(email);

        if (current) {
            current.total_visits += 1;
            current.total_spent += r.amount_total_jpy;
            // Keep name up to date (latest?) - just using first found or overwriting
            // Keep last visit
            if (new Date(r.start_at) > new Date(current.last_visit)) {
                current.last_visit = r.start_at;
                current.name = r.customer_name; // Update name to latest
                current.phone = r.customer_phone || current.phone;
            }
        } else {
            customerMap.set(email, {
                id: email,
                email: email,
                name: r.customer_name,
                phone: r.customer_phone,
                total_visits: 1,
                total_spent: r.amount_total_jpy,
                last_visit: r.start_at,
            });
        }
    }

    let customers = Array.from(customerMap.values());

    // Filter if query exists
    if (query) {
        const lowerQ = query.toLowerCase();
        customers = customers.filter(
            (c) =>
                c.name.toLowerCase().includes(lowerQ) ||
                c.email.toLowerCase().includes(lowerQ) ||
                (c.phone && c.phone.includes(lowerQ))
        );
    }

    // Sort by last visit desc
    customers.sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime());

    return customers;
}

export interface CustomerDetail extends CustomerProfile {
    history: any[]; // Using any for now to avoid circular deps or complex types, or define inline
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
    // ID is email in our current logic
    const email = decodeURIComponent(id);
    const supabase = getSupabaseAdmin();

    // Fetch all reservations for this email
    const { data: reservations, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("customer_email", email)
        .order("start_at", { ascending: false });

    if (error || !reservations || reservations.length === 0) {
        return null;
    }

    // Calculate stats
    const total_visits = reservations.filter(r => r.status !== 'canceled').length;
    const total_spent = reservations.reduce((sum, r) => sum + (r.status !== 'canceled' ? r.amount_total_jpy : 0), 0);
    const last_visit = reservations[0]?.start_at; // Ordered by desc

    // Get latest name/phone
    const latest = reservations[0];

    return {
        id: email,
        email: email,
        name: latest.customer_name,
        phone: latest.customer_phone,
        total_visits,
        total_spent,
        last_visit,
        history: reservations
    };
}
