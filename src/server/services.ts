import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

// Supabaseクエリが外部ネットワークの影響でハングしないようにタイムアウトを付与
async function withTimeout<T>(p: PromiseLike<T>, ms = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`DB operation timeout after ${ms}ms`));
    }, ms);
    // PromiseLike は catch を持たない可能性があるため、then の第二引数でエラー処理
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function getActiveServices() {
  // 公開読み取りは RLS により anon キーで許可されているため、
  // service role が未設定でも取得できるよう匿名クライアントを使用する
  const { createSupabaseBrowserClient } = await import("@/lib/supabase");
  const client = createSupabaseBrowserClient();
  const { data, error } = await withTimeout<any>(
    client
      .from("services")
      .select("*")
      .eq("active", true)
      .order("price_jpy", { ascending: true, nullsFirst: false })
      .order("duration_min", { ascending: true })
      .order("name", { ascending: true }) as any,
    2500,
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as ServiceRow[];
}

export async function getServiceById(id: string): Promise<ServiceRow | null> {
  const client = createSupabaseServiceRoleClient();
  const { data, error } = await withTimeout<any>(
    client
      .from("services")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle() as any,
    2500,
  );

  if (error) {
    throw error;
  }

  return data as ServiceRow | null;
}

export async function getStaffForService(serviceId: string) {
  // 公開読み取りは RLS により anon キーで許可されるため、
  // service role が未設定でも取得できるよう匿名クライアントを使用する
  const { createSupabaseBrowserClient } = await import("@/lib/supabase");
  const client = createSupabaseBrowserClient();

  const { data, error } = await withTimeout<any>(
    client
      .from("staff")
      .select("id, display_name, color, active")
      .eq("active", true) as any,
    2500,
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as StaffRow[];
}

export async function getServiceWithRelations(serviceId: string) {
  const { createSupabaseBrowserClient } = await import("@/lib/supabase");
  const client = createSupabaseBrowserClient();
  const { data, error } = await withTimeout<any>(
    client
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("active", true)
      .limit(1)
      .maybeSingle() as any,
    2500,
  );

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }
  const service = data as ServiceRow;
  const staffList = await getStaffForService(serviceId);
  return { ...service, staff: staffList } as ServiceRow & { staff: StaffRow[] };
}
