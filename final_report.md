# Final Report & Manual Action Required

自動化されたプロセスにより、Cotoka Booking システムの報酬計算・勤怠管理・管理ダッシュボードの統合実装、およびエンドツーエンドのロジック検証が完了しました。
ただし、MCP 接続の権限エラーにより、本番データベースへのマイグレーション適用のみ自動実行できませんでした。

以下の手順に従って、データベースの更新を行ってください。

## 1. データベースマイグレーション (必須)

Supabase SQL Editor または CLI を使用して、以下の SQL を実行してください。
この SQL は冪等性（何度実行しても安全）を考慮して作成されています。

**対象ファイル**: `supabase/migrations/01_enhance_rewards_attendance.sql`

```sql
-- Enum: treatment_reward_status
do $$ begin
  create type treatment_reward_status as enum ('draft', 'approved', 'paid');
exception when duplicate_object then null; end $$;

-- Alter: treatment_rewards
alter table treatment_rewards 
  add column if not exists status treatment_reward_status not null default 'draft',
  add column if not exists paid_at timestamptz,
  add column if not exists calc_source jsonb,
  add column if not exists note text;

-- Table: commission_rules
create table if not exists commission_rules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  rate_type text not null check (rate_type in ('percentage', 'fixed')),
  rate_value numeric not null check (rate_value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Alter: attendance_records (for break time calculation)
alter table attendance_records
  add column if not exists last_break_start_at timestamptz;

-- RLS: commission_rules
alter table commission_rules enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'commission_rules' and policyname = 'Admin manage commission rules') then
    create policy "Admin manage commission rules" on commission_rules
      for all using (public.auth_role() = 'admin' or public.is_service_role());
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'commission_rules' and policyname = 'Staff read own rules') then
    create policy "Staff read own rules" on commission_rules
      for select using (staff_id in (select id from staff where user_id = auth.uid()));
  end if;
  
  -- RLS: treatment_rewards update (for draft)
  if not exists (select 1 from pg_policies where tablename = 'treatment_rewards' and policyname = 'Contractors update own draft rewards') then
    create policy "Contractors update own draft rewards" on treatment_rewards
      for update using (
        staff_id in (select id from staff where user_id = auth.uid()) 
        and status = 'draft'
      );
  end if;
end $$;
```

## 2. 実装完了項目

以下の機能が実装され、モックデータによる E2E テスト (`scripts/verify-e2e.ts`) および静的型チェック (`npm run typecheck`) をパスしています。

### Contractor (業務委託)
- **報酬計算ロジック**: `commission_rules` テーブルに基づき、歩合・固定報酬を自動計算。
- **施術報告 API**: `POST /api/contractor/rewards` により、報告内容を `treatment_rewards` にドラフト保存。
- **UI**: 報酬履歴タイムライン、報告モーダル。

### Employee (雇用スタッフ)
- **勤怠管理ロジック**: 出勤・退勤に加え、休憩開始・終了（`last_break_start_at`）による正確な休憩時間計算を実装。
- **タイムカード API**: `POST /api/attendance/[action]` (`clock_in`, `break_start`, etc.)。
- **UI**: 現在のステータスに応じたボタンを表示するタイムカード。

### Admin (管理者)
- **統合ダッシュボード**: 
  - `DashboardSummary`: 売上、報酬支払予定、総労働時間の KPI 表示。
  - `RealtimeStaffStatus`: スタッフの現在の出勤状況をリアルタイム表示。
  - 既存の予約タイムテーブルとの統合完了。

## 3. 検証結果

`scripts/verify-e2e.ts` の実行結果:
- ✅ **Contractor Flow**: ルール適用、報酬額計算、ドラフト保存の成功を確認。
- ✅ **Employee Flow**: 出勤 -> 休憩 -> 復帰 -> 退勤 のステータス遷移と時間計算の成功を確認。
- ✅ **Admin Flow**: ダッシュボード集計APIのレスポンス形式を確認。

## 4. 残作業・確認事項

- [ ] 上記 SQL の実行。
- [ ] 環境変数の確認: `SUPABASE_URL`, `SUPABASE_ANON_KEY` 等が正しく設定されているか。
- [ ] `src/types/database.ts` は最新スキーマに合わせて更新済みですが、もし Supabase CLI で型生成を自動化している場合は、マイグレーション後に `supabase gen types` を再実行することをお勧めします。
