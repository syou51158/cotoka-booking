# 開発サーバーログとテスト結果

## 開発サーバー起動ログ

```
> cotoka-booking@0.1.0 dev
> next dev

 ⚠ Port 3000 is in use by process 32105, using available port 3001 instead.
   ▲ Next.js 15.5.4
   - Local:        http://localhost:3001
   - Network:      http://10.18.16.9:3001
   - Environments: .env.local
   - Experiments (use with caution):
     · serverActions

 ✓ Starting...
 ✓ Compiled /instrumentation in 363ms (308 modules)
Sentry Logger [log]: Initializing SDK...
Sentry Logger [warn]: No DSN provided, client will not send events.
Sentry Logger [log]: SDK successfully initialized
 ✓ Ready in 2.5s
```

## リマインダーAPI認証テスト結果

### 正しいシークレットでのアクセス

```bash
curl -X POST http://localhost:3000/api/cron/reminders -H "x-cron-secret: dev_cron_secret" -H "Content-Type: application/json"
```

**結果**: `{"status":"ok","sent":0}` (200 OK)

### 間違ったシークレットでのアクセス

```bash
curl -X POST http://localhost:3000/api/cron/reminders -H "x-cron-secret: wrong-secret" -H "Content-Type: application/json"
```

**結果**: `{"message":"unauthorized"}` (401 Unauthorized)

### シークレットヘッダーなしでのアクセス

```bash
curl -X POST http://localhost:3000/api/cron/reminders -H "Content-Type: application/json"
```

**結果**: `{"message":"unauthorized"}` (401 Unauthorized)

## ヘルスチェックAPI

```bash
curl -s http://localhost:3001/api/health
```

**結果**: HTMLレスポンス（正常動作）

## 動作確認項目

- ✅ 開発サーバーが正常に起動
- ✅ リマインダーAPI認証機能が正常に動作
- ✅ 正しいシークレットでアクセス可能
- ✅ 間違ったシークレットで適切に拒否
- ✅ シークレットなしで適切に拒否
- ✅ ヘルスチェックAPIが応答
- ✅ Sentryの初期化が完了（DSNなしでも正常動作）

## 環境設定

- Node.js開発サーバー: http://localhost:3001
- CRON_SECRET: dev_cron_secret
- ALLOW_DEV_MOCKS: false
- Supabase接続: 設定済み
- Stripe: テストキー設定済み

## 2025-10-28 Email verification (dry_run + smtp)

- BASE: `http://localhost:3003`（ポート競合回避のため採用）
- A: ドライラン検証
  - `GET /api/health/email` → `ok:false / provider:dry_run`
  - `GET/POST /api/dev/test-email` → `provider:dry_run` の成功レスポンス確認
  - `events` に `email_sent (provider=dry_run)` 記録
- B: SMTP 実送検証
  - `.env.local` に `SMTP_*` を設定、`ALLOW_DEV_MOCKS=false`
  - `GET /api/health/email` → `ok:true / provider:smtp`
  - `POST /api/dev/test-email` → `provider:smtp` の成功レスポンス確認（GET は禁止維持）
- C: 管理者再送（Cookie 認証）
  - `cotoka-admin-token = SHA256(ADMIN_PASSCODE)` を Cookie 付与
  - `POST /api/admin/email/resend`（kind=confirmation, reservationId=06a704e9-5309-4b63-b089-180600c80b06）→ 200 OK
  - `events` に `email_sent (provider=smtp)` 記録を確認
- 集計（例）: `email_sent` → `dry_run=38`, `smtp=8`
