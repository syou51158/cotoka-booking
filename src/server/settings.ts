import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { revalidateTag } from "next/cache";
import { SITE_NAME, SALON_NAME, SALON_ADDRESS, SALON_PHONE, SALON_MAP_URL, TIMEZONE } from "@/lib/config";
import type { Database } from "@/types/database";
import { recordEvent } from "./events";

export type BusinessProfile = {
  id: 1;
  salon_name: string;
  address_ja?: string;
  address_en?: string;
  address_zh?: string;
  phone?: string;
  email_from: string;
  website_url?: string;
  map_url?: string;
  timezone: string;
  default_locale: "ja" | "en" | "zh";
  currency: string;
  updated_at: string;
  updated_by?: string;
};

type SalonRow = Database["public"]["Tables"]["salons"]["Row"];

// 外部API/DB呼び出しがハングしないように汎用タイムアウトを付与
// Supabase のクエリビルダーは PromiseLike を実装しているため、型互換のために PromiseLike を受け付ける
async function withTimeout<T>(p: PromiseLike<T>, ms = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`Operation timeout after ${ms}ms`));
    }, ms);
    p
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

const DEFAULTS: BusinessProfile = {
  id: 1,
  salon_name: SALON_NAME ?? SITE_NAME ?? "Cotoka",
  address_ja: `〒${SALON_ADDRESS.postalCode} ${SALON_ADDRESS.addressRegion}${SALON_ADDRESS.addressLocality} ${SALON_ADDRESS.streetAddress}`,
  address_en: undefined,
  address_zh: undefined,
  phone: SALON_PHONE ?? undefined,
  email_from: process.env.NOTIFY_FROM_EMAIL ?? "info@example.com",
  website_url: process.env.NEXT_PUBLIC_BASE_URL ?? undefined,
  map_url: SALON_MAP_URL ?? undefined,
  timezone: TIMEZONE ?? "Asia/Tokyo",
  default_locale: "ja",
  currency: "JPY",
  updated_at: new Date().toISOString(),
  updated_by: undefined,
};

export async function getBusinessProfile({ preferCache = true }: { preferCache?: boolean } = {}): Promise<BusinessProfile> {
  // キャッシュ優先時は公開API経由でタグを付けて取得
  if (preferCache) {
    try {
      const res = await withTimeout(
        fetch("/api/settings", {
          method: "GET",
          next: { tags: ["business_settings"] },
          cache: "force-cache",
        }),
        1500,
      );
      if (res.ok) {
        const data = await res.json();
        // 公開APIはサブセットなので合成
        return {
          ...DEFAULTS,
          id: 1,
          salon_name: data.salon_name ?? DEFAULTS.salon_name,
          address_ja: data.address_ja ?? DEFAULTS.address_ja,
          address_en: data.address_en ?? DEFAULTS.address_en,
          address_zh: data.address_zh ?? DEFAULTS.address_zh,
          phone: data.phone ?? DEFAULTS.phone,
          website_url: data.website_url ?? DEFAULTS.website_url,
          map_url: data.map_url ?? DEFAULTS.map_url,
          timezone: data.timezone ?? DEFAULTS.timezone,
          default_locale: (data.default_locale === "en" || data.default_locale === "zh") ? data.default_locale : "ja",
          currency: data.currency ?? DEFAULTS.currency,
          updated_at: data.updated_at ?? DEFAULTS.updated_at,
        } as BusinessProfile;
      }
    } catch (e) {
      // フォールバックへ
    }
  }

  // Supabaseから直接取得（salons テーブルを設定ソースとして利用）
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await withTimeout<any>(
      (supabase
        .from("salons")
        .select("*")
        .eq("salon_id", 1)
        .maybeSingle() as any),
      2500,
    );

    if (error) throw error;
    if (!data) return DEFAULTS;

    const row = data as SalonRow;
    const profile: BusinessProfile = {
      id: 1,
      salon_name: row.name ?? DEFAULTS.salon_name,
      address_ja: row.address ?? DEFAULTS.address_ja,
      address_en: DEFAULTS.address_en,
      address_zh: DEFAULTS.address_zh,
      phone: row.phone ?? DEFAULTS.phone,
      email_from: DEFAULTS.email_from,
      website_url: DEFAULTS.website_url,
      map_url: DEFAULTS.map_url,
      timezone: DEFAULTS.timezone,
      default_locale: DEFAULTS.default_locale,
      currency: DEFAULTS.currency,
      updated_at: row.updated_at ?? DEFAULTS.updated_at,
      updated_by: DEFAULTS.updated_by,
    };
    return profile;
  } catch {
    return DEFAULTS;
  }
}

export type AdminCtx = { user_id?: string; email?: string };

export async function updateBusinessProfile(input: Partial<BusinessProfile>, adminCtx?: AdminCtx): Promise<BusinessProfile> {
  const supabase = createSupabaseServiceRoleClient();

  // 現在値取得
  const before = await getBusinessProfile({ preferCache: false });

  // 入力をマージ
  const next: BusinessProfile = {
    ...before,
    ...input,
    id: 1,
    default_locale: (input.default_locale === "en" || input.default_locale === "zh") ? input.default_locale : (input.default_locale === "ja" ? "ja" : before.default_locale),
    updated_at: new Date().toISOString(),
    updated_by: adminCtx?.email ?? adminCtx?.user_id ?? undefined,
  } as BusinessProfile;

  // バリデーション（必須）
  if (!next.salon_name || !next.email_from || !next.timezone || !next.default_locale) {
    throw new Error("Validation failed: salon_name, email_from, timezone, default_locale are required");
  }

  // 差分抽出
  const fields_changed: string[] = [];
  for (const key of [
    "salon_name","address_ja","address_en","address_zh","phone","email_from","website_url","map_url","timezone","default_locale","currency"
  ] as const) {
    if ((before as any)[key] !== (next as any)[key]) fields_changed.push(key);
  }

  // salons テーブルへ反映（id=1 相当の salon_id を更新）
  // Insert の必須カラム（tenant_id 等）が不明のため、update のみに留める
  const { data, error } = await supabase
    .from("salons")
    .update({
      name: next.salon_name,
      address: next.address_ja ?? null,
      phone: next.phone ?? null,
      updated_at: next.updated_at,
    })
    .eq("salon_id", 1)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  const saved = data as SalonRow | null;

  // イベント記録
  await recordEvent("settings.updated", {
    updated_by: next.updated_by ?? null,
    fields_changed,
    before,
    after: next,
  });

  // キャッシュ無効化
  revalidateTag("business_settings");

  return {
    id: 1,
    salon_name: saved?.name ?? next.salon_name,
    address_ja: saved?.address ?? next.address_ja ?? undefined,
    address_en: next.address_en,
    address_zh: next.address_zh,
    phone: saved?.phone ?? next.phone ?? undefined,
    email_from: next.email_from,
    website_url: next.website_url,
    map_url: next.map_url,
    timezone: next.timezone,
    default_locale: next.default_locale,
    currency: next.currency,
    updated_at: saved?.updated_at ?? next.updated_at,
    updated_by: next.updated_by,
  };
}