## プロジェクト概要
- フレームワーク: Next.js（App Router）・TypeScript・ESLint/Prettier
- 主要依存: `next`, `react`, `@supabase/supabase-js`, `stripe`, `nodemailer`, `zod`, `@sentry/nextjs`, `tailwindcss`
- 構成ファイル: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`
- ディレクトリ: `src/app`（ページ・API）, `src/server`（ドメインロジック）, `src/lib`（設定/ユーティリティ）, `src/components`
- 環境ファイル: `.env.local`, `.env.example`, `.env.local.example`（`SITE_URL=http://localhost:3000` 他）
- Supabase: `src/lib/supabase.ts`（ブラウザ/サービスロールクライアント）, `src/types/database.ts`, `supabase/migration.sql`

## 実施ステップ
### 1. 開発環境の起動・基本動作確認
- `npm run dev` で起動（ポートは常に `3000`）
- `http://localhost:3000` でトップページ表示確認
- `src/app/api/health/route.ts` がある場合、`GET /api/health` でヘルス確認

### 2. 環境変数の整合性チェック
- `.env.local` の必須変数（`SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `EXPECTED_PROJECT_REF`, `ADMIN_PASSCODE`, `STRIPE_*`, `SMTP_*` など）を確認
- `src/lib/env.ts` の `zod` 検証に通るかを起動ログまたは専用ルート（存在すれば `api/dev` 相当）で確認

### 3. Supabase 接続の検証
- `src/lib/supabase.ts` 経由でブラウザクライアントを初期化できるか確認
- `EXPECTED_PROJECT_REF` と接続先の `projectRef` が一致することを確認
- 代表的サーバ関数（例: `src/server/reservations.ts`, `src/server/slots.ts`）が正常応答するか API 経由で確認

### 4. 予約・支払い・メール系の軽い動作確認
- 予約関連 API（`src/app/api/reservations/**/route.ts`）の 1〜2 パスを GET/POST で確認
- Stripe テストキーでの初期化確認（ダッシュボード連携はテスト環境で）
- SMTP またはローカルメールプレビューの確認（`.env.local` コメントに基づく Dev メールプレビュー導線があれば起動/表示）

### 5. スモークテスト・ログ監視
- `npm run smoke` の実行（`scripts/smoke.ts`）で主要 API を一括確認
- Sentry 設定（`sentry.client.config.ts`, `sentry.server.config.ts`）の初期化ログを確認
- 既知ログ（`LOGS.md`）の「3000番使用中」ケースがあれば再起動で解消

### 6. 開発者向け運用の確認
- Lint/Format/Typecheck: `npm run lint`, `npm run format:check`, `npm run typecheck`
- Tailwind v4 設定が読み込まれているか（ページで簡易 UI 確認）

## 期待成果
- ローカルで `http://localhost:3000` の基本動作が安定
- 環境変数・Supabase 接続が整合していることを確認
- 主要 API（予約/メール/支払い）が最低限応答
- Lint/Typecheck が通り、追加実装へ進める状態