import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

type StaffServiceJoined = {
  staff: StaffRow | null;
};

export async function getActiveServices() {
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("services")
    .select("*")
    .eq("active", true)
    .order("price_jpy", { ascending: true, nullsFirst: false })
    .order("duration_min", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ServiceRow[];
}

export async function getServiceById(id: string): Promise<ServiceRow | null> {
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("services")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ServiceRow | null;
}

export async function getStaffForService(serviceId: string) {
  const client = createSupabaseServiceRoleClient();

  const { data, error } = await (client as any)
    .from("staff_services")
    .select("staff:staff_id(*)")
    .eq("service_id", serviceId);

  if (error) {
    throw error;
  }

  // staff.active / staff.is_active のいずれにも対応してフィルタする
  const rows = (data ?? []) as StaffServiceJoined[];
  return rows
    .map((row) => row.staff)
    .filter((s) => Boolean((s as any)?.active ?? (s as any)?.is_active)) as StaffRow[];
}

export async function getServiceWithRelations(serviceId: string) {
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await (client as any)
    .from("services")
    .select("*, staff:staff_services(staff:staff_id(*))")
    .eq("id", serviceId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  type StaffJoin = { staff: StaffRow | null };
  const joined = data as unknown as ServiceRow & { staff?: StaffJoin[] | null };
  const staffList = (joined.staff ?? [])
    .map((item: StaffJoin) => item.staff)
    .filter(Boolean) as StaffRow[];

  const { staff: _ignore, ...serviceCore } = joined;
  return { ...(serviceCore as ServiceRow), staff: staffList } as ServiceRow & {
    staff: StaffRow[];
  };
}
