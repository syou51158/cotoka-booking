import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

type TreatmentRewardRow = Database["public"]["Tables"]["treatment_rewards"]["Row"];
type CommissionRuleRow = Database["public"]["Tables"]["commission_rules"]["Row"];

/**
 * 報酬計算ロジック
 * commission_rules テーブルを参照して、スタッフ・サービスに応じた報酬額を算出する
 */
export async function calculateCommission(
  staffId: string,
  serviceId: string,
  totalSales: number,
  supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()
): Promise<{ rate: number; amount: number; ruleApplied: string | null }> {
  
  // 1. 有効なルールを取得
  const { data: rules } = await supabase
    .from("commission_rules")
    .select("*")
    .eq("staff_id", staffId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  let appliedRule: CommissionRuleRow | undefined;
  
  if (rules && rules.length > 0) {
    // A. サービス固有のルールを優先検索
    appliedRule = rules.find(r => r.service_id === serviceId);
    
    // B. なければデフォルトルール (service_id が null) を検索
    if (!appliedRule) {
      appliedRule = rules.find(r => r.service_id === null);
    }
  }

  // ルールが見つかった場合
  if (appliedRule) {
    let amount = 0;
    const rateValue = Number(appliedRule.rate_value);
    
    if (appliedRule.rate_type === 'fixed') {
      amount = rateValue;
    } else {
      // percentage
      amount = Math.floor(totalSales * (rateValue / 100));
    }
    
    return {
      rate: rateValue,
      amount,
      ruleApplied: `Rule ID: ${appliedRule.id} (${appliedRule.rate_type})`
    };
  }

  // ルールがない場合は 0 とする
  return { rate: 0, amount: 0, ruleApplied: null };
}

/**
 * 施術完了報告 & 報酬登録
 * 予約IDを指定し、売上実績を入力して報酬を確定（または下書き保存）する
 */
export async function reportTreatmentCompletion(input: {
  reservationId: string;
  totalSales?: number; // 上書き用。指定なければ予約情報の amount_total_jpy を使用
  note?: string;
}, supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()) {

  // 1. 予約情報の取得
  const { data: reservation, error: resError } = await supabase
    .from("reservations")
    .select("*, staff_id, service_id, amount_total_jpy, status")
    .eq("id", input.reservationId)
    .single();

  if (resError || !reservation) {
    throw new Error("Reservation not found");
  }

  if (!reservation.staff_id) {
    throw new Error("No staff assigned to this reservation");
  }

  // 2. 売上額の決定
  const totalSales = input.totalSales ?? reservation.amount_total_jpy;

  // 3. 報酬計算
  const { rate, amount, ruleApplied } = await calculateCommission(
    reservation.staff_id,
    reservation.service_id,
    totalSales,
    supabase
  );

  // 4. 既存レコードの確認 (承認済み/支払済みなら更新不可)
  const { data: existing } = await supabase
    .from("treatment_rewards")
    .select("id, status")
    .eq("reservation_id", input.reservationId)
    .maybeSingle();

  if (existing && existing.status !== 'draft') {
    throw new Error("Cannot update approved or paid reward");
  }

  // 5. 報酬レコードの保存 (Upsert)
  const payload = {
    staff_id: reservation.staff_id,
    reservation_id: input.reservationId,
    total_sales_jpy: totalSales,
    commission_rate: rate,
    reward_amount_jpy: amount,
    status: "draft" as const, // 初期状態はドラフト（スタッフ本人が報告した段階）
    calc_source: { rule: ruleApplied, logic: "v2-rules" },
    note: input.note ?? null,
  };

  const { data: reward, error: upsertError } = await supabase
    .from("treatment_rewards")
    .upsert(payload, { onConflict: "reservation_id" })
    .select()
    .single();

  if (upsertError) throw upsertError;

  // 6. 予約ステータスの更新
  if (reservation.status !== 'completed' && !["canceled", "no_show"].includes(reservation.status)) {
    await supabase
      .from("reservations")
      .update({ 
        status: 'completed' as any,
        updated_at: new Date().toISOString() 
      })
      .eq("id", input.reservationId);
  }

  return reward;
}

/**
 * スタッフの報酬履歴取得
 */
export async function getStaffRewards(staffId: string, supabase: SupabaseClient<Database> = createSupabaseServiceRoleClient()) {
  const { data, error } = await supabase
    .from("treatment_rewards")
    .select(`
      *,
      reservation:reservation_id(
        id,
        code,
        start_at,
        customer_name,
        service:service_id(name)
      )
    `)
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
