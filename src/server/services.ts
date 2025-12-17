import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

// Supabaseクエリが外部ネットワークの影響でハングしないようにタイムアウトを付与
const DB_TIMEOUT_MS = process.env.NODE_ENV === "development" ? 12000 : 6000;
async function withTimeout<T>(p: PromiseLike<T>, ms = DB_TIMEOUT_MS): Promise<T> {
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
  const isServer = typeof window === "undefined";
  let client: ReturnType<typeof createSupabaseServiceRoleClient> | any;
  if (isServer) {
    client = createSupabaseServiceRoleClient();
  } else {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase");
    client = createSupabaseBrowserClient();
  }
  const { data, error } = await withTimeout<any>(
    client
      .from("services")
      .select("*")
      .eq("active", true)
      .order("price_jpy", { ascending: true, nullsFirst: false })
      .order("duration_min", { ascending: true })
      .order("name", { ascending: true }) as any,
    DB_TIMEOUT_MS,
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
    DB_TIMEOUT_MS,
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
    DB_TIMEOUT_MS,
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
    DB_TIMEOUT_MS,
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
import { revalidateTag } from "next/cache";

export type ServiceInput = {
  name: string;
  name_en?: string;
  name_zh?: string;
  description?: string;
  description_en?: string;
  description_zh?: string;
  duration_min: number;
  price_jpy: number;
  buffer_before_min: number;
  buffer_after_min: number;
  require_prepayment: boolean;
  active: boolean;
};

/**
 * サービスを作成
 */
export async function createService(input: ServiceInput): Promise<ServiceRow> {
  const client = createSupabaseServiceRoleClient();
  
  // バリデーション
  if (!input.name || input.name.trim().length === 0) {
    throw new Error("サービス名は必須です");
  }
  if (input.duration_min <= 0) {
    throw new Error("所要時間は正の数値である必要があります");
  }
  if (input.price_jpy < 0) {
    throw new Error("価格は0以上の数値である必要があります");
  }
  if (input.buffer_before_min < 0 || input.buffer_after_min < 0) {
    throw new Error("バッファ時間は0以上の数値である必要があります");
  }

  const { data, error } = await withTimeout<any>(
    client
      .from("services")
      .insert({
        name: input.name.trim(),
        name_en: input.name_en?.trim() || null,
        name_zh: input.name_zh?.trim() || null,
        description: input.description?.trim() || null,
        description_en: input.description_en?.trim() || null,
        description_zh: input.description_zh?.trim() || null,
        duration_min: input.duration_min,
        price_jpy: input.price_jpy,
        buffer_before_min: input.buffer_before_min,
        buffer_after_min: input.buffer_after_min,
        require_prepayment: input.require_prepayment,
        active: input.active,
      })
      .select()
      .single() as any,
    DB_TIMEOUT_MS,
  );

  if (error) throw error;
  
  revalidateTag("services");
  return data as ServiceRow;
}

/**
 * サービスを更新
 */
export async function updateService(
  serviceId: string,
  updates: Partial<ServiceInput>
): Promise<ServiceRow> {
  const client = createSupabaseServiceRoleClient();
  
  // バリデーション
  if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
    throw new Error("サービス名は必須です");
  }
  if (updates.duration_min !== undefined && updates.duration_min <= 0) {
    throw new Error("所要時間は正の数値である必要があります");
  }
  if (updates.price_jpy !== undefined && updates.price_jpy < 0) {
    throw new Error("価格は0以上の数値である必要があります");
  }
  if (updates.buffer_before_min !== undefined && updates.buffer_before_min < 0) {
    throw new Error("バッファ時間は0以上の数値である必要があります");
  }
  if (updates.buffer_after_min !== undefined && updates.buffer_after_min < 0) {
    throw new Error("バッファ時間は0以上の数値である必要があります");
  }

  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // 文字列フィールドのトリム処理
  if (updateData.name) updateData.name = updateData.name.trim();
  if (updateData.name_en) updateData.name_en = updateData.name_en.trim();
  if (updateData.name_zh) updateData.name_zh = updateData.name_zh.trim();
  if (updateData.description) updateData.description = updateData.description.trim();
  if (updateData.description_en) updateData.description_en = updateData.description_en.trim();
  if (updateData.description_zh) updateData.description_zh = updateData.description_zh.trim();

  const { data, error } = await withTimeout<any>(
    client
      .from("services")
      .update(updateData)
      .eq("id", serviceId)
      .select()
      .single() as any,
    DB_TIMEOUT_MS,
  );

  if (error) throw error;
  
  revalidateTag("services");
  return data as ServiceRow;
}

/**
 * サービスを削除（論理削除）
 */
export async function deleteService(serviceId: string): Promise<void> {
  const client = createSupabaseServiceRoleClient();
  
  // 関連する予約があるかチェック
  const { data: reservations } = await withTimeout<any>(
    client
      .from("reservations")
      .select("id")
      .eq("service_id", serviceId)
      .limit(1) as any,
    DB_TIMEOUT_MS,
  );

  if (reservations && reservations.length > 0) {
    throw new Error("このサービスに関連する予約があるため、削除できません");
  }

  const { error } = await withTimeout<any>(
    client
      .from("services")
      .update({ 
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", serviceId) as any,
    DB_TIMEOUT_MS,
  );

  if (error) throw error;
  
  revalidateTag("services");
}

/**
 * 全サービスを取得（管理画面用）
 */
export async function getAllServices(): Promise<ServiceRow[]> {
  const client = createSupabaseServiceRoleClient();
  
  const { data, error } = await withTimeout<any>(
    client
      .from("services")
      .select("*")
      .order("created_at", { ascending: false }) as any,
    DB_TIMEOUT_MS,
  );

  if (error) throw error;
  return data as ServiceRow[];
}
