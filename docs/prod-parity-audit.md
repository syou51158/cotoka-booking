# 本番パリティ監査レポート（Cotoka Booking）

作成日: 2025-10-28

## 概要

- 目的: 開発・本番で挙動が一致しているか（パリティ）を監査し、リスクと改善提案をまとめる。
- 対象: スロット取得、決済（Stripe）、リマインダー、管理API、開発専用API、ヘルスチェック、メール送信。

## 主な所見（ハイライト）

- モック許可は `ALLOW_DEV_MOCKS`（Server）と `NEXT_PUBLIC_ALLOW_DEV_MOCKS`（Client）で分岐。エンドポイントごとに条件が異なる。
- サービス一覧は `GET /api/services?mock=1` のときのみ、開発かつ両フラグが true でモック返却（`X-Data-Source: mock`）。それ以外はDB（`X-Data-Source: db`）。
- スロット取得は `POST /api/slots?source=mock` の明示指定時のみ、開発かつ `ALLOW_DEV_MOCKS=true` でモック生成。DBエラーのうちサービスロール未設定は `503` を返す。
- Stripe 確認 `GET /api/stripe/confirm` は `ALLOW_DEV_MOCKS=true` で Stripe 照合をスキップして支払い完了扱い。通常は Stripe API で `paid` を確認。
- Webhook は `STRIPE_WEBHOOK_SECRET` 必須で、未設定時に例外。失敗は `400`。
- Cron リマインダーは本番で `CRON_SECRET` ヘッダー必須。開発では時刻シミュレーション（`shiftMinutes` 等）可能。
- ヘルス：`/api/health/env` は不足ENVを `missing` に列挙し `200`。`/api/health/db` は成功/失敗とも `200`。`/api/health/email` は未設定で `200`（ok:false）、検証失敗は `500`。
- メール送信は SMTP 未設定時に送信不可（例外）。README の「開発でドライラン記録（provider=dry_run）」記述と実装が不一致（現実は SMTP 必須）。
- ベースURLは `ALLOWED_BASE_HOSTS` による許可制。`/api/reservations` と `/api/stripe/checkout` のレスポンスに `X-Base-Url` を付与。

## 詳細挙動マップ

### スロット（`POST /api/slots`）

- 入力: `serviceId,date,staffId`。クエリ: `source=mock|db`, `useDb=1`。
- 開発: `ALLOW_DEV_MOCKS=true` かつ `NODE_ENV!==production` で `source=mock` の場合、モックスロット生成。
- 本番: DBから取得。`SUPABASE_SERVICE_ROLE_KEY` 未設定が原因のエラーは `503`、その他は `500`。

### サービス一覧（`GET /api/services`）

- 開発モック条件: `NODE_ENV!==production` 且つ `ALLOW_DEV_MOCKS=true` 且つ `NEXT_PUBLIC_ALLOW_DEV_MOCKS=true` 且つ `mock=1`。
- ヘッダー: モック時 `X-Data-Source: mock`、DB時 `X-Data-Source: db`。
- エラー: 失敗時 `500`。

### 予約作成（`POST /api/reservations`）

- 支払いオプション: `prepay`（Stripe）/ `in_store`（店頭）。
- `prepay`: チェックアウトセッション作成。失敗時 `400`（Stripe作成失敗）、その他 `500`。レスポンスに `X-Base-Url`。
- `in_store`: 予約確認メール送信、記録。レスポンスに `X-Base-Url`。

### 決済（Stripe）

- `POST /api/stripe/checkout`: セッション作成。`X-Base-Url` 付与。エラー時 `400` or `500`。
- `GET /api/stripe/confirm`: `rid` と `cs_id` 必須。開発で `ALLOW_DEV_MOCKS=true` の場合は Stripe 照合をスキップし `paid` 扱い。未決済は `409`、その他 `500`。
- `POST /api/stripe/webhook`: `STRIPE_WEBHOOK_SECRET` 必須。検証・処理失敗は `400`。

### Cron リマインダー（`GET/POST /api/cron/reminders`）

- 本番: `x-cron-secret: CRON_SECRET` ヘッダー必須。未設定は `500`、不一致は `401`。
- 開発: `ALLOW_DEV_MOCKS=true` で時刻シミュレーション（`shiftMinutes`, `window24m`, `window2m`）。
- 成功時は送信件数・所要時間などを `200` で返却。失敗は `500`。

### 管理メール再送（`POST /api/admin/email/resend`）

- 本番: `ADMIN_EMAIL_DOMAINS` 未設定だと `503`。管理者認証・レート制限・冪等性チェックあり。
- ステータス: `401` 認証エラー、`400` バリデーション、`429` レート制限、`409` 冪等性衝突、`404` 予約なし、`500` 内部エラー。

### 開発専用API

- `GET /api/dev/mock/checkout-complete`: `ALLOW_DEV_MOCKS=true` 必須。「支払い済み」化とメール送信・イベント記録。未許可は `404`。
- `GET /api/dev/mock/settle-payment`: 同上。`method=cash` 等で決済記録。
- `GET/POST /api/dev/test-email`: `ALLOW_DEV_MOCKS=true` 必須。SMTP未設定だと送信不能（例外）。
- `GET /api/dev/debug/events`: `ALLOW_DEV_MOCKS=true` 必須。最新イベント50件。フィルタ（`rid`, `typePrefix`）。
- `GET /api/dev/debug/payment-summary`: 両フラグ `ALLOW_DEV_MOCKS` と `NEXT_PUBLIC_ALLOW_DEV_MOCKS` が true のときのみ許可。

### ヘルスチェック

- `GET /api/health/env`: `ok` と `missing`（`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`）を `200` で返却。
- `GET /api/health/db`: 成否に関わらず `200`。`ok` と `error` をペイロードで返す。
- `GET /api/health/email`: `SMTP_HOST`/`SMTP_USER` 未設定なら `200`（ok:false）。検証失敗は `500`。

## リスク・相違

- ドキュメントと実装の差異: READMEの「開発でメールをドライラン（`provider=dry_run`）記録」は現実の実装に存在せず、SMTP未設定だと失敗する。
- 環境変数未設定の扱いが場所により 200/400/500/503 と分散（例: DBヘルスは 200、スロットは 503）。
- 開発モックの許可条件がエンドポイント毎に微妙に異なる（例: services は両フラグ、slots はサーバフラグのみ）。

## 改善提案

- メールのドライラン実装を追加: `ALLOW_DEV_MOCKS=true` かつ SMTP未設定の場合は送信をスキップして `email_sent` を `provider=dry_run` で記録。`email_send_failed` は例外時のみ。
- モック条件の統一: 開発モックは「開発 + 両フラグ許可 + 明示クエリ指定」の原則に統一し、`X-Data-Source` を全モック応答で付与。
- ENV不足のHTTPステータス指針:
  - クライアント確認用: ヘルス系は常に `200` で `ok/missing` を返す。
  - 実稼働不可の操作: 必須キー不足は `503`（サービス不可）。
  - バリデーションエラー: `400`。
- Stripe 例外時のイベント記録の強化と、リトライ/バックオフ戦略の文書化。
- `ALLOWED_BASE_HOSTS` の運用ガイドを明示（例: 本番ホストに限定、ローカルを除外）。

## クイックチェック（開発）

- ヘルス環境: `GET /api/health/env`（`missing` の確認）。
- メールヘルス: `GET /api/health/email`（未設定なら ok:false）。
- サービスモック: `GET /api/services?mock=1`（条件満たすと `X-Data-Source: mock`）。
- スロットモック: `POST /api/slots?source=mock`（開発+サーバフラグでモック）。

## 次のアクション（推奨）

1. メールドライランの実装を追加し、READMEと整合。
2. モック許可条件を統一（両フラグ+明示指定）し、ガイド更新。
3. ENV不足時のステータス規約をドキュメント化し、各APIへ適用。
4. 監視用イベント（`stripe.*`, `email_*`）のダッシュボード化。
