# 変更ファイル一覧

## 修正されたファイル (Modified)
- README.md
- next.config.ts
- package-lock.json
- package.json
- src/app/admin/(protected)/page.tsx
- src/app/api/admin/export/route.ts
- src/app/globals.css
- src/app/layout.tsx
- src/app/page.tsx
- src/server/payments.ts

## 新規追加されたファイル (New)
- .husky/
- components.json
- scripts/
- sentry.client.config.ts
- sentry.server.config.ts
- src/app/[locale]/
- src/app/admin/(auth)/
- src/app/admin/(protected)/actions.ts
- src/app/admin/(protected)/layout.tsx
- src/app/admin/(protected)/schedule/
- src/app/admin/ops-checklist/
- src/app/api/admin/payment-history/
- src/app/api/cron/
- src/app/api/dev/debug/events/
- src/app/api/dev/debug/notifications/
- src/app/api/dev/debug/reservation/
- src/app/api/dev/mock/
- src/app/api/health/
- src/app/api/ics/
- src/app/api/manage/
- src/app/api/reservations/
- src/app/api/services/
- src/app/api/slots/
- src/app/api/stripe/
- src/app/api/test/
- src/app/manage/
- src/app/robots.txt/
- src/components/
- src/i18n/
- src/instrumentation.ts
- src/lib/
- src/server/_dev_mocks/
- src/server/admin.ts
- src/server/events.ts
- src/server/ics.ts
- src/server/notifications.ts
- src/server/reservations.ts
- src/server/services.ts
- src/server/slots.ts
- src/server/stripe.ts
- src/types/
- supabase/
- tsconfig.loose.json

## 主要な変更内容

### 予約フローUIの統一
- 日時選択ページ（select）にStickySummaryを追加
- 確認ページ（confirm）の期間表示を統一（min表記をdurationLabelに）
- SelectClientコンポーネントから重複するStickySummaryを削除
- SelectPageClientコンポーネントを新規作成し、選択状態に応じた動的更新を実装

### リマインダーAPI認証機能
- `/api/cron/reminders`エンドポイントにx-cron-secretヘッダーによる認証機能を実装
- 正しいシークレットでのアクセス時は200 OK、間違ったシークレットでは401 Unauthorizedを返却

### その他の機能追加
- 多言語対応（日本語・英語）
- Stripe決済連携
- 管理画面機能
- 通知メール機能
- ICSカレンダー出力機能
- Sentry監視機能