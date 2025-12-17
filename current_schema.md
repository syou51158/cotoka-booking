# Cotoka Relax & Beauty SPA — Current DB Schema (Read‑Only)

本ドキュメントは、リポジトリに含まれるマイグレーション SQL と生成済み TypeScript 型から、現在の Supabase/PostgreSQL スキーマとテーブル構造を徹底的に整理したものです。実際の DB には RLS や追加カラムが反映済みの場合がありますが、本書は読み取り専用での現状把握に特化しています。

## スキーマ
- `public`

## 列挙型（Enums）
- `reservation_status`: `pending` | `unpaid` | `processing` | `paid` | `confirmed` | `canceled` | `no_show` | `refunded`
- `staff_block_type`: `task` | `break` | `walk_in`
- `app_role`: `admin` | `employee` | `contractor`
- `attendance_status`: `working` | `break` | `clocked_out`

## 関数（Functions）
- `public.auth_role()`: JWT クレーム `role` を参照し、未設定時は `anon`
- `public.is_service_role()`: JWT クレーム `role` が `service_role` かを判定
- `public.lookup_reservation(p_code, p_contact)`: コード＋連絡先で予約を 1 件返す（security definer）
- `public.admin_reservations_between(p_from, p_to)`: 管理権限で期間内予約を返す（security definer）

## RLS（Row Level Security）有効化状況と主なポリシー
- RLS 有効（対象テーブル）: `services`, `staff`, `rooms`, `staff_services`, `opening_hours`, `date_overrides`, `shifts`, `reservations`, `events`, `staff_blocks`, `attendance_records`, `treatment_rewards`
- 代表的ポリシー
  - `services`: `Public can read active services`（`active=true` のみ SELECT）／`Admin manage services`（ALL; `auth_role()='admin'` または `is_service_role()`）
  - `staff`: `Public can read active staff`（SELECT）／`Admin manage staff`（ALL）
  - `rooms`, `staff_services`, `opening_hours`, `date_overrides`, `shifts`, `events`, `staff_blocks`: いずれも `Admin manage ...`（ALL）
  - `reservations`: `Admin manage reservations`（ALL）／`Public insert pending reservations`（INSERT; `role in ('anon','authenticated')` かつ `status='pending'` ほか制約）
  - `attendance_records`: `Admin manage attendance`（ALL）／`Employees read/insert/update own attendance`（`staff_id` が自分の `auth.uid()` に紐づくスタッフ）
  - `treatment_rewards`: `Admin manage rewards`（ALL）／`Contractors read/insert own rewards`（`staff_id` が自分の `auth.uid()` に紐づくスタッフ）

---

## テーブル詳細（主要ドメイン）

### `services`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `name` `text` NOT NULL
  - `description` `text`
  - `duration_min` `integer` NOT NULL CHECK `> 0`
  - `buffer_before_min` `integer` NOT NULL DEFAULT `0`
  - `buffer_after_min` `integer` NOT NULL DEFAULT `0`
  - `price_jpy` `integer` NOT NULL CHECK `>= 0`
  - `requires_prepayment` `boolean` NOT NULL DEFAULT `true`
  - `currency` `text` NOT NULL DEFAULT `'JPY'`
  - `active` `boolean` NOT NULL DEFAULT `true`
  - `created_at` `timestamptz` NOT NULL DEFAULT `now()`
  - `updated_at` `timestamptz` NOT NULL DEFAULT `now()`
  - 参考（コード参照）: `slot_interval_min` `integer`（存在する前提で参照される）
- 制約
  - PK: `id`
- RLS
  - Public SELECT（`active=true`）／Admin/Service 全操作可

### `staff`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `display_name` `text` NOT NULL
  - `email` `text` UNIQUE
  - `phone` `text`
  - `color` `text` DEFAULT `'#64748B'`
  - `active` `boolean` NOT NULL DEFAULT `true`
  - `created_at` `timestamptz` NOT NULL DEFAULT `now()`
  - `updated_at` `timestamptz` NOT NULL DEFAULT `now()`
  - `role` `app_role` NOT NULL DEFAULT `'contractor'`
  - `user_id` `uuid` REFERENCES `auth.users(id)`
  - 参考（コード参照）: `slot_interval_min` `integer`
- 制約
  - PK: `id`
  - UQ: `email`
- RLS
  - Public SELECT（`active=true`）／Admin/Service 全操作可

### `rooms`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `name` `text` NOT NULL
  - `capacity` `integer` NOT NULL DEFAULT `1`
  - `active` `boolean` NOT NULL DEFAULT `true`
- 制約
  - PK: `id`
- RLS
  - Admin/Service 全操作可

### `staff_services`
- カラム
  - `staff_id` `uuid` NOT NULL REFERENCES `staff(id)` ON DELETE CASCADE
  - `service_id` `uuid` NOT NULL REFERENCES `services(id)` ON DELETE CASCADE
- 制約
  - PK: `(staff_id, service_id)`
- RLS
  - Admin/Service 全操作可

### `opening_hours`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `weekday` `int` NOT NULL CHECK `0..6`
  - `open_at` `time` NOT NULL
  - `close_at` `time` NOT NULL
  - `is_open` `boolean` NOT NULL DEFAULT `true`
- 制約
  - UQ: `weekday`
- RLS
  - Admin/Service 全操作可

### `date_overrides`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `date` `date` NOT NULL
  - `open_at` `time`
  - `close_at` `time`
  - `is_open` `boolean` NOT NULL DEFAULT `false`
  - `note` `text`
- RLS
  - Admin/Service 全操作可

### `shifts`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `staff_id` `uuid` NOT NULL REFERENCES `staff(id)` ON DELETE CASCADE
  - `start_at` `timestamptz` NOT NULL
  - `end_at` `timestamptz` NOT NULL
  - `note` `text`
  - 参考（コード参照）: `created_at` `timestamptz`, `updated_at` `timestamptz`
- RLS
  - Admin/Service 全操作可（従業員の自分のシフト編集は現状ポリシー未定義）

### `staff_blocks`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `staff_id` `uuid` NOT NULL REFERENCES `staff(id)` ON DELETE CASCADE
  - `start_at` `timestamptz` NOT NULL
  - `end_at` `timestamptz` NOT NULL
  - `block_type` `staff_block_type` NOT NULL
  - `note` `text`
  - `created_at` `timestamptz` NOT NULL DEFAULT `now()`
  - `updated_at` `timestamptz` NOT NULL DEFAULT `now()`
- RLS
  - Admin/Service 全操作可

### `reservations`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `code` `text` UNIQUE NOT NULL
  - `customer_name` `text` NOT NULL
  - `customer_email` `text`
  - `customer_phone` `text`
  - `service_id` `uuid` NOT NULL REFERENCES `services(id)`
  - `staff_id` `uuid` REFERENCES `staff(id)`
  - `room_id` `uuid` REFERENCES `rooms(id)`
  - `start_at` `timestamptz` NOT NULL
  - `end_at` `timestamptz` NOT NULL
  - `status` `reservation_status` NOT NULL DEFAULT `'pending'`
  - `stripe_payment_intent` `text`
  - `stripe_checkout_session` `text`
  - `amount_total_jpy` `integer` NOT NULL
  - `locale` `text` DEFAULT `'ja'`
  - `notes` `text`
  - `created_at` `timestamptz` NOT NULL DEFAULT `now()`
  - `updated_at` `timestamptz` NOT NULL DEFAULT `now()`
  - 追加カラム: `payment_option` `text` CHECK in (`'pay_in_store'`, `'prepay'`)
  - 追加カラム: `pending_expires_at` `timestamptz`
  - 追加カラム: `last_magic_link_jti` `text`
  - 追加カラム: `email_verified_at` `timestamptz`
- 制約／インデックス
  - UQ: `code`
  - UQ(partial): `(staff_id, start_at, end_at)` WHERE `status <> 'canceled'` AND `staff_id IS NOT NULL`
  - UQ(partial): `(room_id, start_at, end_at)` WHERE `status <> 'canceled'` AND `room_id IS NOT NULL`
  - IDX: `(status, pending_expires_at)`
- RLS
  - Admin/Service 全操作可／Public INSERT 制限付き（`pending`のみ、連絡先必須、Stripe 未連携）

### `events`
- カラム
  - `id` `bigserial` NOT NULL PK
  - `type` `text` NOT NULL
  - `payload` `jsonb` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT `now()`
- RLS
  - Admin/Service 全操作可

### `reservation_notifications`
- カラム
  - `id` `bigserial` NOT NULL PK
  - `reservation_id` `uuid` NOT NULL REFERENCES `reservations(id)` ON DELETE CASCADE
  - `kind` `text` NOT NULL CHECK in (`'created'`, `'24h'`, `'2h'`)
  - `scheduled_at` `timestamptz`
  - `sent_at` `timestamptz`
- 制約
  - UQ: `(reservation_id, kind)`
- RLS
  - マイグレーション定義には明示なし（現状 Service/Admin からの操作前提）

### `coupons`
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `code` `text` UNIQUE NOT NULL
  - `percent_off` `numeric(5,2)`
  - `amount_off_jpy` `integer`
  - `active` `boolean` NOT NULL DEFAULT `true`
  - `valid_from` `timestamptz`
  - `valid_until` `timestamptz`

### `attendance_records`（雇用スタッフ向け勤怠）
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `staff_id` `uuid` NOT NULL REFERENCES `staff(id)` ON DELETE CASCADE
  - `date` `date` NOT NULL DEFAULT `current_date`
  - `clock_in_at` `timestamptz` NOT NULL
  - `clock_out_at` `timestamptz`
  - `break_minutes` `integer` DEFAULT `0`
  - `status` `attendance_status` NOT NULL DEFAULT `'working'`
  - `created_at` `timestamptz` NOT NULL DEFAULT `now()`
  - `updated_at` `timestamptz` NOT NULL DEFAULT `now()`
- RLS
  - Admin/Service 全操作可／Employees は自分のレコードのみ SELECT/INSERT/UPDATE 可

### `treatment_rewards`（業務委託の報酬）
- カラム
  - `id` `uuid` NOT NULL PK DEFAULT `gen_random_uuid()`
  - `reservation_id` `uuid` NOT NULL REFERENCES `reservations(id)` ON DELETE CASCADE
  - `staff_id` `uuid` NOT NULL REFERENCES `staff(id)` ON DELETE CASCADE
  - `total_sales_jpy` `integer` NOT NULL CHECK `>= 0`
  - `commission_rate` `numeric(5,2)` NOT NULL CHECK `>= 0`
  - `reward_amount_jpy` `integer` NOT NULL CHECK `>= 0`
  - `created_at` `timestamptz` NOT NULL DEFAULT `now()`
- 制約
  - UQ: `reservation_id`
- RLS
  - Admin/Service 全操作可／Contractors は自分のレコードのみ SELECT/INSERT 可

---

## テーブル詳細（レガシー／マルチテナント系・型情報より）
型定義 `src/types/database.ts` に存在し、現行実装では未使用の可能性があるテーブル群です。

- `appointments`（予約明細・レガシー）
- `customers`（顧客・レガシー）
- `service_categories` / `services_legacy`（メニューカテゴリ・旧版）
- `staff_legacy`（スタッフ・旧版）
- `rooms`（現行で使用）
- `salons`（店舗プロフィール）
- `roles` / `users` / `user_salons`（RBAC/テナント関連・旧版）
- `remember_tokens` / `login_attempts`（認証補助・旧版）

各テーブルのカラム型・NULL 可否は `Row` 型に準拠（例: `string | null` は NULL 許容）。

---

## リレーション（業務ドメイン）
- 予約（`reservations`）
  - `service_id` → `services.id`
  - `staff_id` → `staff.id`
  - `room_id` → `rooms.id`
  - 時間帯重複防止: `uniq_staff_time` / `uniq_room_time`（部分ユニーク）
- スタッフとメニューの紐付け（`staff_services`）
  - `(staff_id, service_id)` の複合 PK
- オープン時間（`opening_hours`）＋特例（`date_overrides`）
  - UI の空き枠算出で組み合わせ利用
- シフト（`shifts`）＋休憩/作業ブロック（`staff_blocks`）
  - 当日の予約・シフト・ブロックを統合して空き枠を算出
- 通知ログ（`reservation_notifications`）
  - `reservation_id` → `reservations.id`
- 勤怠（`attendance_records`）
  - `staff_id` → `staff.id`
- 報酬（`treatment_rewards`）
  - `reservation_id` → `reservations.id`
  - `staff_id` → `staff.id`

---

## 既存ロール／権限（API/JWT 想定）
- JWT `role` クレームに基づく擬似ロール
  - `anon` / `authenticated`（公開・ログインユーザー）
  - `service_role`（サーバー側キー）
  - `admin`（管理者; `auth_role() = 'admin'`）
- RLS ポリシーは上記ロールを前提に設計（Public 参照、Admin/Service 管理、Employee/Contractor は自己レコード限定）

---

## コード参照から推定される補助テーブル
- `site_settings`
  - 用途: 予約枠の間隔デフォルト（`default_slot_interval_min`）の保持
  - カラム例: `id`, `default_slot_interval_min`, `updated_at`
  - 実テーブルは別マイグレーションで作成されている可能性
- `services.slot_interval_min` / `staff.slot_interval_min`
  - サービス／スタッフごとの枠間隔の上書き

---

## 拡張提案（現行構造を壊さない案／軽リファクタ案）

### 役割・権限（Admin／Employee／Contractor）に必要な追加
- 最小拡張案（互換維持）
  - `staff.role` の活用を前提に、RLS を追加拡張
    - Reservations: Employee/Contractor が自分担当（`staff_id=自分`）のみ SELECT／Notes 更新を許可
    - Shifts/Staff Blocks: Employee/Contractor が自分の行のみ INSERT/UPDATE/DELETE 可
    - `reservation_notifications`: RLS 有効化＋ Admin/Service のみ操作可
  - `site_settings` を正式テーブル化（存在しない場合）
    - `default_slot_interval_min`／監査用 `updated_at`／`updated_by`
  - 認証連携: `staff.user_id` をログインユーザーに張る運用導線の整備（JWT `role` 付与）

- 軽リファクタ案（柔軟性向上）
  - 権限マップテーブル `permission_rules`
    - `role` × `resource` × `action`（例: `employee`, `reservations`, `update_notes`）で柔軟管理
    - RLS 内で `exists(select 1 from permission_rules ...)` を用いて判定

### 業務委託の「施術報告→売上・報酬自動計算→集計」
- 最小拡張案（互換維持）
  - `treatment_rewards` に算出根拠を保持するカラム追加
    - `calc_source` `jsonb`（売上内訳、適用ルール、小計の記録）
    - `status` `text`（`draft`/`approved`/`paid`）
  - ルール定義テーブル `commission_rules`
    - `staff_id`／`service_id` or `category_id`／`rate_type`（`percentage`/`fixed`）／`rate_value`／期間（`effective_from/to`）
  - 月次集計テーブル `contractor_monthly_summaries`
    - `staff_id`／`year_month`／`total_sales_jpy`／`total_reward_jpy`／`generated_at`
  - 支払台帳 `payouts`
    - `staff_id`／`period_start`／`period_end`／`amount_jpy`／`paid_at`／`method`／`notes`

- 軽リファクタ案（柔軟性向上）
  - 施術報告テーブル `treatment_reports`
    - `reservation_id`／`staff_id`／`reported_at`／`notes`／`extra_sales_jpy`／`materials_cost_jpy`
    - 報告→計算→`treatment_rewards` 生成のワークフローを明確化
  - サービスカテゴリ導入（既存 `service_categories` の活用）
    - ルールをカテゴリ単位で適用できるよう整理

### 雇用スタッフの勤怠管理（打刻・勤務時間集計）
- 最小拡張案（互換維持）
  - 打刻イベントテーブル `attendance_events`
    - `staff_id`／`event_type`（`clock_in`/`break_start`/`break_end`/`clock_out`）／`occurred_at`／`source`（`manual`/`device`）
    - バッチで `attendance_records`（日次集計）を更新
  - 時給レート `wage_rates`
    - `staff_id`／`hourly_jpy`／期間（`effective_from/to`）
  - 月次集計 `employee_monthly_summaries`
    - `staff_id`／`year_month`／`worked_minutes`／`break_minutes`／`wage_total_jpy`

- 軽リファクタ案（柔軟性向上）
  - シフトと打刻の整合性チェック関数（例: `fn_validate_attendance_against_shifts`）
    - 警告イベントを `events` に記録
  - `shifts` に `created_at`/`updated_at`/`created_by` を追加し監査性向上

---

## 備考
- 本ドキュメントは読み取り専用の整理であり、マイグレーションや DDL の実行は行っていません。
- `site_settings` や `slot_interval_min` はコードからの参照に基づくため、環境によっては未作成の場合があります。
