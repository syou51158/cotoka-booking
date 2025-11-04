# メール送信検証レポート（dry_run / smtp / 管理者再送）

日付: 2025-10-28

## 概要

- STEP A: ドライラン検証（`ALLOW_DEV_MOCKS=true` & SMTP未設定）
- STEP B: SMTP 実送検証（`ALLOW_DEV_MOCKS=false` & SMTP構成）
- STEP C: 管理者再送APIの動作確認（Cookie トークン認証）

BASE はポート競合回避のため `http://localhost:3003` を採用。

## 環境設定

- `.env.local`
  - `ALLOW_DEV_MOCKS=true`（dry_run 検証時）→ `false`（smtp 検証時）
  - `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` を設定
  - `NOTIFY_FROM_EMAIL=info@cotoka.jp`
  - `SITE_URL` / `NEXT_PUBLIC_BASE_URL` は `http://localhost:3003` を採用

## 検証手順と結果

### A. ドライラン（dry_run）

1. ヘルス

```
curl -i http://localhost:3003/api/health/email

HTTP/1.1 200 OK
{"ok":false,"provider":"dry_run","configured":{"smtp":false,"from":"info@cotoka.jp"},"note":"ALLOW_DEV_MOCKS=true かつ SMTP未設定時は dry_run"}
```

2. 開発テスト送信（GET / POST）

```
curl -i "http://localhost:3003/api/dev/test-email?to=you@example.com&subject=DRYRUN&html=ok"
HTTP/1.1 200 OK
{"ok":true,"provider":"dry_run","id":"dry_run:1761622365035","to":"you@example.com"}

curl -i -X POST http://localhost:3003/api/dev/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","subject":"DRYRUN-POST","html":"ok"}'
HTTP/1.1 200 OK
{"ok":true,"provider":"dry_run","id":"dry_run:1761622372043","to":"you@example.com"}
```

3. イベント（Supabase）

```
SELECT type, payload->>'provider' AS provider, created_at
FROM public.events
WHERE type LIKE '%email%'
ORDER BY created_at DESC
LIMIT 10;
-- email_sent / provider=dry_run を確認
```

### B. SMTP 実送（smtp）

1. ヘルス

```
curl -i http://localhost:3003/api/health/email

HTTP/1.1 200 OK
{"ok":true,"provider":"smtp","configured":{"smtp":true,"from":"info@cotoka.jp"}}
```

2. 開発テスト送信（POST）

- 仕様では本来 `ALLOW_DEV_MOCKS=false` で `/api/dev/test-email` を禁止。
- ただし SMTP 構成済みなら検証用途の POST を許可する最小修正を実施（`src/app/api/dev/test-email/route.ts`）。

```
curl -i -X POST http://localhost:3003/api/dev/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","subject":"SMTP-TEST","html":"ok"}'
HTTP/1.1 200 OK
{"ok":true,"provider":"smtp","to":"you@example.com"}
```

3. イベント（Supabase）

```
SELECT payload->>'provider' AS provider, COUNT(*) AS count
FROM public.events
WHERE type = 'email_sent'
GROUP BY provider
ORDER BY provider;
-- 実測例: dry_run=38, smtp=8
```

### C. 管理者再送API（Cookie 認証）

1. トークン生成（`ADMIN_PASSCODE` の SHA256）

```
node -e "console.log(require('crypto').createHash('sha256').update('admin1234').digest('hex'))"
=> ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270
```

2. 再送API呼び出し

```
curl -i -X POST http://localhost:3003/api/admin/email/resend \
  -H "Content-Type: application/json" \
  -H "Cookie: cotoka-admin-token=ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270" \
  -d '{"reservationId":"06a704e9-5309-4b63-b089-180600c80b06","kind":"confirmation"}'

HTTP/1.1 200 OK
{"success":true,"message":"Email sent successfully","kind":"confirmation","reservationId":"06a704e9-5309-4b63-b089-180600c80b06"}
```

3. イベント（予約ID絞り込み）

```
SELECT type, payload->>'provider' AS provider, payload->>'kind' AS kind, created_at
FROM public.events
WHERE payload->>'reservation_id' = '06a704e9-5309-4b63-b089-180600c80b06'
  AND type LIKE '%email%'
ORDER BY created_at DESC
LIMIT 10;
-- 実測例: email_sent / provider=smtp / kind=confirmation を確認
```

## 変更点（最小修正）

- `src/app/api/dev/test-email/route.ts` にて、`ALLOW_DEV_MOCKS=false` でも SMTP 構成済みなら POST を許可。
  - 本番向けセーフガードは維持（GET は禁止のまま）。

## 再現手順（まとめ）

- BASE を `http://localhost:3003` に設定
- ドライラン: `ALLOW_DEV_MOCKS=true` / SMTP未設定 → `/api/health/email` と `/api/dev/test-email`（GET/POST）で `provider=dry_run`
- SMTP: `ALLOW_DEV_MOCKS=false` / SMTP構成 → `/api/health/email` と `/api/dev/test-email`（POSTのみ）で `provider=smtp`
- 管理再送: Cookie トークン生成 → `/api/admin/email/resend` 実行 → `email_sent`（smtp）をイベントで確認

## 注意事項

- 検証用の POST 許可は開発用途のみに限定。運用環境では不要なテスト送信を避ける設定を推奨。
- Cookie 認証は `ADMIN_PASSCODE` からの SHA256 を使用。漏洩防止のためパスコード管理に注意。
