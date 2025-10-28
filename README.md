# Cotoka Relax & Beauty SPA – Booking Foundation

Cotoka Relax & Beauty SPA (烏丸御池) の予約・決済体験を Next.js + Supabase + Stripe で実現する基盤実装です。フェーズA要求（サービス選択 → スタッフ/日時 → 情報入力 → Stripe 決済 → 完了）に加え、Phase B/C に向けた管理ダッシュボード、通知、マルチロケール、顧客向け管理画面の土台を含みます。

## 技術スタック

- Next.js (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + RLS + RPC)
- Stripe Checkout + Webhook (+ Resend によるメール通知)

## 環境変数

`.env.example` を `.env.local` にコピーして以下を設定してください。

```
NEXT_PUBLIC_SITE_NAME=Cotoka
NEXT_PUBLIC_TIMEZONE=Asia/Tokyo
NEXT_PUBLIC_DEFAULT_LOCALE=ja
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SITE_URL=http://localhost:3000
ALLOWED_BASE_HOSTS=localhost:3000,localhost:3001,localhost:3002
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=anon-public-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
ADMIN_PASSCODE=change-me
RESEND_API_KEY=
NOTIFY_FROM_EMAIL=no-reply@example.com
CRON_SECRET=local-cron-secret
ALLOW_DEV_MOCKS=false
NEXT_PUBLIC_ALLOW_DEV_MOCKS=false
```

- `ADMIN_PASSCODE`: `/admin` ログイン用のワンタイムパスコード
- `RESEND_API_KEY` / `NOTIFY_FROM_EMAIL`: 予約確定メール・リマインダー送信用
- `CRON_SECRET`: リマインダー用 Cron エンドポイントを保護するための shared secret
- `ALLOW_DEV_MOCKS` / `NEXT_PUBLIC_ALLOW_DEV_MOCKS`: 開発用モックデータの許可（本番は `false` 推奨）

## URL 生成ポリシー（本番運用）

- 優先順: `X-Forwarded-*` → `SITE_URL` → `request.url.origin`
- 本番は `https` を強制（`http://` は `https://` に置換）
- 許可ホスト（allowlist）: `.env.local` の `ALLOWED_BASE_HOSTS`（カンマ区切り）。allowlist 外の `host` は拒否し、`SITE_URL` にフォールバック
- 成功ページ自動確認は `rid + cs_id` が揃ったときのみ実行（`/api/stripe/confirm?rid=...&cs_id=...`）。Webhook が一次、成功ページは保険（`cs_id` はマスクして `payment_confirm_attempt` を記録）
- `success_url` / `cancel_url` は必ず `base + "/{locale}/success?rid=...&cs_id={CHECKOUT_SESSION_ID}"` / `base + "/{locale}/booking"` 形式で生成

## トラブル時の確認手順

- `/api/reservations` / `/api/stripe/checkout` のレスポンスヘッダ `X-Base-Url` を確認（実際に採用されたベースURL）
- `/[locale]/success` 到達時に自動確認が走らない場合、`rid` と `cs_id` の両方がURLに含まれているか確認
- `events` テーブルの `payment_confirm_attempt` / `reservation_paid` を確認（失敗理由、`url_base`、`cs_id_masked` など）
- Stripe Webhook の `constructEvent` 検証に失敗する場合は `STRIPE_WEBHOOK_SECRET` を確認し、App Router では `await req.text()` を用いること
- 環境検査: `GET /api/health/env` で必須キーの設定状況を確認 / `http://localhost:3000/dev/env` でUI表示

## セットアップ

```bash
npm install
cp .env.example .env.local
# 必要なキーを .env.local に転記
npm run dev

# 型チェック運用

- 開発中: `npm run typecheck:loose`
- 本対応時: `npm run typecheck:strict`（既存の Next 15 型差分を解消した後に有効化）

# 開発者向けスモークテスト

- `.env.local` に `ALLOW_DEV_MOCKS=true` と `NEXT_PUBLIC_ALLOW_DEV_MOCKS=true` を設定し、サーバーを起動した状態で `npm run smoke`
- 成功すると予約作成→擬似決済→リマインダー検証まで自動確認されます
- 失敗時は標準エラーに原因が出力されるので、シード不足・営業設定・シフトなどを確認してください
```

## Supabase への適用

1. Supabase プロジェクトを作成し、`.env.local` を更新します。
2. `supabase/migration.sql` にはスキーマ、Seed データ、RLS ポリシー、RPC（予約検索/管理者向け予約取得）が含まれています。
   - Supabase Studio の SQL Editor に貼り付けて実行するか、Supabase CLI を利用します。
     ```bash
     supabase db push --file supabase/migration.sql
     ```
3. RLS は以下を前提としています。
   - `services` は公開読み取り (`active = true` のみ)
   - `reservations` は一般ユーザーの `insert` のみ許可、`lookup_reservation` RPC で照会
   - `auth.jwt()` の `role=admin` または service role で全テーブル管理可能

## Stripe / 通知テスト

- Webhook 受信:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```
- 決済テストカード: `4242 4242 4242 4242`
- 予約確定メール、24h/2h 前リマインダーは Resend を利用します。
  - `.env.local` で `RESEND_API_KEY` / `NOTIFY_FROM_EMAIL` を設定（本番）
  - 開発（`ALLOW_DEV_MOCKS=true`）ではプロバイダ未設定でも送信をドライランし、`events` に `email_sent` を記録します（`provider=dry_run` / `attempt`、失敗時は `email_send_failed`）。
  - リマインダー実行: `POST /api/cron/reminders` に `x-cron-secret: $CRON_SECRET` ヘッダーを付与（開発の `GET` はヘッダー不要）

  - 確認用エンドポイント（開発）:
    ```bash
    curl "http://localhost:3000/api/dev/debug/notifications?rid=<RID>"   # reservation_notifications の sent_at を確認
    curl "http://localhost:3000/api/dev/debug/events?rid=<RID>&typePrefix=email"  # email_* / reservation.*.sent を確認
    ```

- 簡易毎時 cron（開発）
  ```bash
  while true; do
    curl -s "http://localhost:3000/api/cron/reminders" >/dev/null
    sleep 3600
  done
  ```

## サービス取得ポリシー（重要）

- データ源は Supabase の `public.services` が唯一です（DBを正とする）。
- モックは開発時のみ、`/api/services?mock=1` を明示指定した場合に限り返却します（`ALLOW_DEV_MOCKS=true` かつ `NEXT_PUBLIC_ALLOW_DEV_MOCKS=true`）。
- 本番ではモック不可。デフォルトは `.env.local` で `ALLOW_DEV_MOCKS=false` / `NEXT_PUBLIC_ALLOW_DEV_MOCKS=false` を推奨します。
- API はレスポンスヘッダに `X-Data-Source: db|mock` を付与します。UI はモックフラグを一切見ず、APIの返り値にのみ従います。
- サービスの追加/変更は Supabase Studio の SQL Editor で UPSERT を実行してください（サンプルは本README下部参照）。

## エンドポイントサマリ

| Method | Path                   | 用途                                                              |
| ------ | ---------------------- | ----------------------------------------------------------------- |
| GET    | `/api/services`        | 公開サービス一覧取得                                              |
| POST   | `/api/slots`           | `{ serviceId, date, staffId? }` から空き枠生成                    |
| POST   | `/api/reservations`    | pending 予約を作成（リードタイム/重複/RLS 対応）                  |
| POST   | `/api/stripe/checkout` | Checkout セッション生成                                           |
| POST   | `/api/stripe/webhook`  | `checkout.session.completed` 受信 → `status=paid` 更新 & 通知送信 |
| POST   | `/api/manage/lookup`   | 顧客向け予約照会（コード + メール/電話）                          |
| POST   | `/api/manage/update`   | 顧客が連絡先・備考を更新                                          |
| POST   | `/api/manage/cancel`   | 顧客が予約キャンセル                                              |
| POST   | `/api/cron/reminders`  | 24h/2h 前リマインダー送信（Cron 呼び出し）                        |

## 画面フロー（公開）

すべて `/[locale]/...` 配下で、`ja/en/zh` を切替可能です。

- `/{locale}/booking` – サービス一覧
- `/{locale}/booking/[serviceId]` – サービス詳細
- `/{locale}/booking/[serviceId]/select` – スタッフ選択 & 週表示カレンダー
- `/{locale}/booking/[serviceId]/confirm` – 情報入力 → Stripe Checkout
- `/{locale}/success` / `/{locale}/cancel` – 決済後遷移
- `/{locale}/manage` – 予約番号 + 連絡先で照会/連絡先修正/キャンセル

## 管理ダッシュボード（Phase B）

- `/admin/login` にアクセスし、`ADMIN_PASSCODE` を入力
- 機能概要
  - 予約台帳: 当日予約一覧、ステータス表示、キャンセル操作
  - 営業設定: 曜日別営業時間、特別営業/休業日、スタッフシフト CRUD
- すべて service role を介した Server Actions で動作し、`events` テーブルに監査ログを記録

## 通知ワークフロー

- Stripe Webhook 成功時: Resend で予約確定メール送信 (`reservation.confirmation.sent` を `events` に記録)
- Cron エンドポイント: `paid/confirmed` 予約に対し 24h/2h 前リマインダーを送信、重複送信は `events` の記録で判定

### リマインド自動化の設定手順

1. 環境変数の設定（本番環境）
   - `RESEND_API_KEY` と `NOTIFY_FROM_EMAIL` を設定（メール送信元）
   - `CRON_SECRET` を十分に長いランダム文字列で設定（共有シークレット）
2. 監視/スケジューラを選定
   - 例: GitHub Actions / Render Cron / Cloudflare Workers / Supabase Scheduler 等
3. 例: GitHub Actions による 15分間隔呼び出し
   - `.github/workflows/reminders.yml` を作成し、以下を設定
     ```yaml
     name: reservation-reminders
     on:
       schedule:
         - cron: "*/15 * * * *"  # 15分ごと（適宜調整）
       workflow_dispatch: {}
     jobs:
       send-reminders:
         runs-on: ubuntu-latest
         steps:
           - name: Call reminder endpoint
             env:
               BASE_URL: ${{ secrets.SITE_URL }}
               CRON_SECRET: ${{ secrets.CRON_SECRET }}
             run: |
               curl -X POST "$BASE_URL/api/cron/reminders" \
                 -H "x-cron-secret: $CRON_SECRET"
     ```
   - リマインドは 24h/2h のウィンドウで自動送信され、二重送信は `reservation_notifications` のログ + `events` で抑止します
4. 動作確認
   - 本番ではヘッダー必須。開発では `ALLOW_DEV_MOCKS=true` により `shiftMinutes` 等で時刻をシミュレート可能
   - 送信プロバイダ未設定の場合でも、`reservation.reminder.skipped_no_provider` イベントを記録します

## 動作確認チェックリスト

1. Supabase に `supabase/migration.sql` を適用し、Seed（サービス・スタッフ・営業時間）を投入
2. `npm run dev` で起動し、`http://localhost:3000/ja/booking` から予約フローを確認
   - 直近 3 時間は空き枠が表示されないこと
   - 連絡先（メール/電話）と 3 チェックボックスが必須であること
3. 予約 → Stripe Checkout → テストカードで決済 → `/ja/success` へ遷移
   - Supabase で `status = paid` になっていること
4. 2 ブラウザで同一枠を同時予約し、片方が `409 SLOT_TAKEN` になること
5. `/admin` で予約一覧が表示され、シフト/営業時間 CRUD が反映されること
6. `/ja/manage` で予約番号 + メール/電話から照会・更新・キャンセルができること
7. `POST /api/cron/reminders` を叩き、対象予約にメールが送信されること（SMTP 接続で送信。`GET /api/health/email` とイベントログで確認可能）

## 補足

- 予約コードは `COT-YYYYMMDD-XXXX` 形式で自動生成
- 予約テーブルはスタッフ・ルーム単位でユニーク制約を設定 (`status <> 'canceled'` の場合のみ)
- Supabase RPC: `lookup_reservation`（顧客照会）、`admin_reservations_between`（管理者集計）を用意
- 主要ロジックは service-role クライアントで実装していますが、RLS により anon キーアクセスも制御可能です

## プロジェクト構成

```
src/
  app/
    [locale]/...    # 公開フロー / i18n ルーティング
    admin/          # 管理ダッシュボード
    api/            # API ルート (Stripe, manage, cron)
  components/       # UI コンポーネント & 予約/管理用ウィジェット
  i18n/             # 辞書データ
  lib/              # 設定・Supabase/認証ユーティリティ
  server/           # Supabase / Stripe / 通知ロジック
  types/            # Supabase 型定義
supabase/migration.sql
```

## 今後の拡張候補

- 管理 UI のアクセス制御を本番用 Auth / Supabase Auth と連携
- 予約確認メールのテンプレート化、SMS 送信など通知チャネルの拡張
- `/manage` からのリスケジューリング（空き枠再検索）
- E2E テスト（重複防止/決済/休業日/メール/時差）
