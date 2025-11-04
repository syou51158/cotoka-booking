# トラブルシューティングガイド

## 概要

Cotoka Bookingアプリケーションで発生する可能性のある問題と、その解決方法について説明します。

## 目次

1. [メール配信の問題](#1-メール配信の問題)
2. [リマインダー自動化の問題](#2-リマインダー自動化の問題)
3. [認証・権限の問題](#3-認証権限の問題)
4. [データベースの問題](#4-データベースの問題)
5. [パフォーマンスの問題](#5-パフォーマンスの問題)
6. [デプロイメントの問題](#6-デプロイメントの問題)

## 1. メール配信の問題

### 1.1 メールが送信されない

#### 症状

- メール送信APIが失敗する
- エラーログに配信エラーが記録される

#### 考えられる原因と解決方法

**原因1: Resend APIキーの問題**

```bash
# 確認方法
curl -X GET 'https://api.resend.com/domains' \
  -H 'Authorization: Bearer YOUR_API_KEY'

# 解決方法
1. 環境変数RESEND_API_KEYを確認
2. ResendダッシュボードでAPIキーの有効性を確認
3. 必要に応じて新しいAPIキーを生成
```

**原因2: ドメイン認証の問題**

```bash
# DNS設定の確認
dig TXT yourdomain.com | grep spf
dig CNAME resend._domainkey.yourdomain.com

# 解決方法
1. DKIM、SPF設定を再確認
2. DNS変更の反映を待つ（最大48時間）
3. Resendダッシュボードでドメイン認証状態を確認
```

**原因3: レート制限**

```javascript
// ログで確認
console.log('Rate limit status:', rateLimitResult);

// 解決方法
1. 送信頻度を調整
2. バッチ処理の実装
3. レート制限設定の見直し
```

### 1.2 メールが迷惑メールフォルダに入る

#### 症状

- メールは送信されるが、受信者の迷惑メールフォルダに分類される

#### 解決方法

1. **DKIM/SPF設定の確認**

   ```bash
   # メール認証の確認
   dig TXT _dmarc.yourdomain.com
   ```

2. **送信者レピュテーションの改善**
   - 一貫した送信者アドレスの使用
   - バウンス率の削減
   - 適切な配信停止機能の実装

3. **メールコンテンツの最適化**
   - スパムトリガーワードの回避
   - HTMLとテキストの両方提供
   - 適切な件名の設定

### 1.3 メール配信の遅延

#### 症状

- メール送信から受信まで時間がかかる

#### 解決方法

```javascript
// 配信時間の監視
const startTime = Date.now();
await sendEmail(emailData);
const deliveryTime = Date.now() - startTime;
console.log(`Email delivery time: ${deliveryTime}ms`);

// 対策
1. 送信頻度の調整
2. 非同期処理の最適化
3. Resendサービス状態の確認
```

## 2. リマインダー自動化の問題

### 2.1 CRONジョブが実行されない

#### 症状

- 定期的なリマインダーメールが送信されない
- Cloud Schedulerのログにエラーが記録される

#### 確認方法

```bash
# Cloud Schedulerのログ確認
gcloud logging read "resource.type=cloud_scheduler_job" --limit=50

# アプリケーションログの確認
curl -X GET "https://yourdomain.com/api/cron/reminders?CRON_SECRET=your-secret"
```

#### 解決方法

**原因1: CRON認証の問題**

```javascript
// 環境変数の確認
console.log('CRON_SECRET configured:', !!process.env.CRON_SECRET);

// 解決方法
1. CRON_SECRECTの設定確認
2. Cloud SchedulerのHTTPヘッダー設定確認
3. 認証ロジックの確認
```

**原因2: エンドポイントの問題**

```bash
# エンドポイントの手動テスト
curl -X POST "https://yourdomain.com/api/cron/reminders" \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"

# 解決方法
1. エンドポイントのURLを確認
2. HTTPメソッドの確認（POST/GET）
3. ヘッダー設定の確認
```

### 2.2 リマインダーが重複送信される

#### 症状

- 同じ予約に対して複数のリマインダーが送信される

#### 確認方法

```sql
-- 重複送信の確認
SELECT
  payload->>'reservation_id' as reservation_id,
  payload->>'email_type' as email_type,
  COUNT(*) as send_count,
  MIN(created_at) as first_sent,
  MAX(created_at) as last_sent
FROM events
WHERE type = 'email_sent'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY payload->>'reservation_id', payload->>'email_type'
HAVING COUNT(*) > 1;
```

#### 解決方法

```javascript
// 冪等性チェックの実装確認
const idempotencyResult = await checkEmailIdempotency(reservationId, emailType);
if (!idempotencyResult.isAllowed) {
  console.log('Duplicate email prevented:', idempotencyResult.reason);
  return;
}

// 対策
1. 冪等性チェック機能の確認
2. イベント記録の確認
3. CRONジョブの重複実行防止
```

### 2.3 リマインダーのタイミングが不正確

#### 症状

- 24時間前、2時間前のタイミングがずれる

#### 確認方法

```javascript
// タイミング計算の確認
const now = new Date();
const referenceDate = new Date(now.getTime() + shiftMinutes * 60 * 1000);
console.log("Reference date:", referenceDate.toISOString());
console.log("24h window:", window24h);
console.log("2h window:", window2h);
```

#### 解決方法

1. **タイムゾーンの確認**

   ```javascript
   // UTC時間での処理確認
   console.log(
     "Server timezone:",
     Intl.DateTimeFormat().resolvedOptions().timeZone,
   );
   ```

2. **ウィンドウ設定の調整**
   ```javascript
   // ウィンドウサイズの調整
   const window24h = { start: 23.5 * 60, end: 24.5 * 60 }; // 23.5-24.5時間前
   const window2h = { start: 1.5 * 60, end: 2.5 * 60 }; // 1.5-2.5時間前
   ```

## 3. 認証・権限の問題

### 3.1 管理者認証が失敗する

#### 症状

- 管理者機能にアクセスできない
- 401 Unauthorizedエラーが発生

#### 確認方法

```javascript
// 認証状態の確認
const authResult = await verifyAdminAuth(request);
console.log("Auth result:", authResult);
```

#### 解決方法

1. **Supabase認証の確認**

   ```javascript
   // JWTトークンの確認
   const token = request.headers.get("authorization")?.replace("Bearer ", "");
   const { data, error } = await supabase.auth.getUser(token);
   ```

2. **管理者ドメイン制限の確認**

   ```javascript
   // 環境変数の確認
   console.log("ADMIN_EMAIL_DOMAINS:", process.env.ADMIN_EMAIL_DOMAINS);

   // ドメイン検証の確認
   const userEmail = user.email;
   const allowedDomains = process.env.ADMIN_EMAIL_DOMAINS?.split(",") || [];
   const isAllowed = allowedDomains.some((domain) =>
     userEmail.endsWith(`@${domain}`),
   );
   ```

### 3.2 API制限エラー

#### 症状

- 429 Too Many Requestsエラー
- レート制限に達したメッセージ

#### 確認方法

```javascript
// レート制限状態の確認
const rateLimitStatus = checkRateLimit(request, options);
console.log("Rate limit status:", rateLimitStatus);
```

#### 解決方法

1. **制限値の調整**

   ```javascript
   // レート制限設定の見直し
   const rateLimitOptions = {
     windowMs: 60 * 60 * 1000, // 1時間
     maxRequests: 20, // 20回まで（10回から増加）
   };
   ```

2. **リクエスト頻度の調整**
   - クライアント側でのリトライ間隔調整
   - バッチ処理の実装
   - キャッシュの活用

## 4. データベースの問題

### 4.1 接続エラー

#### 症状

- データベースクエリが失敗する
- 接続タイムアウトエラー

#### 確認方法

```javascript
// 接続テスト
const { data, error } = await supabase
  .from("reservations")
  .select("count")
  .limit(1);

if (error) {
  console.error("Database connection error:", error);
}
```

#### 解決方法

1. **接続設定の確認**

   ```javascript
   // 環境変数の確認
   console.log("SUPABASE_URL configured:", !!process.env.SUPABASE_URL);
   console.log(
     "SUPABASE_SERVICE_ROLE_KEY configured:",
     !!process.env.SUPABASE_SERVICE_ROLE_KEY,
   );
   ```

2. **接続プールの最適化**
   ```javascript
   // 接続プールサイズの調整
   const supabase = createClient(url, key, {
     db: {
       schema: "public",
     },
     auth: {
       autoRefreshToken: false,
       persistSession: false,
     },
   });
   ```

### 4.2 クエリパフォーマンスの問題

#### 症状

- データベースクエリが遅い
- タイムアウトエラーが発生

#### 確認方法

```sql
-- 実行計画の確認
EXPLAIN ANALYZE
SELECT * FROM reservations
WHERE appointment_datetime BETWEEN $1 AND $2;

-- インデックスの確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'reservations';
```

#### 解決方法

1. **インデックスの追加**

   ```sql
   -- 日時検索用インデックス
   CREATE INDEX idx_reservations_appointment_datetime
   ON reservations(appointment_datetime);

   -- 複合インデックス
   CREATE INDEX idx_reservations_status_datetime
   ON reservations(status, appointment_datetime);
   ```

2. **クエリの最適化**
   ```javascript
   // 必要なカラムのみ選択
   const { data } = await supabase
     .from("reservations")
     .select("id, customer_email, appointment_datetime")
     .gte("appointment_datetime", startTime)
     .lte("appointment_datetime", endTime);
   ```

## 5. パフォーマンスの問題

### 5.1 レスポンス時間の遅延

#### 症状

- APIレスポンスが遅い
- ページ読み込みに時間がかかる

#### 確認方法

```javascript
// レスポンス時間の測定
const startTime = Date.now();
const response = await fetch("/api/endpoint");
const responseTime = Date.now() - startTime;
console.log(`Response time: ${responseTime}ms`);
```

#### 解決方法

1. **キャッシュの実装**

   ```javascript
   // メモリキャッシュ
   const cache = new Map();

   async function getCachedData(key) {
     if (cache.has(key)) {
       return cache.get(key);
     }

     const data = await fetchData(key);
     cache.set(key, data);
     return data;
   }
   ```

2. **データベースクエリの最適化**
   ```javascript
   // バッチクエリの使用
   const reservations = await supabase
     .from("reservations")
     .select(
       `
       *,
       service:service_id(name),
       staff:staff_id(display_name)
     `,
     )
     .in("id", reservationIds);
   ```

### 5.2 メモリ使用量の増加

#### 症状

- アプリケーションのメモリ使用量が増加
- Out of Memoryエラー

#### 確認方法

```javascript
// メモリ使用量の監視
const memUsage = process.memoryUsage();
console.log("Memory usage:", {
  rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
  heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB",
  heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
});
```

#### 解決方法

1. **メモリリークの修正**

   ```javascript
   // イベントリスナーの適切な削除
   useEffect(() => {
     const handleEvent = () => {
       /* ... */
     };
     window.addEventListener("event", handleEvent);

     return () => {
       window.removeEventListener("event", handleEvent);
     };
   }, []);
   ```

2. **大量データの処理最適化**
   ```javascript
   // ストリーミング処理
   async function processLargeDataset(data) {
     const batchSize = 100;
     for (let i = 0; i < data.length; i += batchSize) {
       const batch = data.slice(i, i + batchSize);
       await processBatch(batch);

       // メモリ解放のための待機
       if (i % 1000 === 0) {
         await new Promise((resolve) => setTimeout(resolve, 10));
       }
     }
   }
   ```

## 6. デプロイメントの問題

### 6.1 ビルドエラー

#### 症状

- デプロイ時にビルドが失敗する
- TypeScriptエラーが発生

#### 確認方法

```bash
# ローカルでのビルドテスト
npm run build

# 型チェック
npm run type-check

# リンターチェック
npm run lint
```

#### 解決方法

1. **依存関係の確認**

   ```bash
   # 依存関係の更新
   npm update

   # パッケージの整合性確認
   npm audit
   ```

2. **型エラーの修正**
   ```typescript
   // 型定義の追加
   interface EmailData {
     to: string;
     subject: string;
     html: string;
   }
   ```

### 6.2 環境変数の問題

#### 症状

- 本番環境で機能が動作しない
- 環境変数が読み込まれない

#### 確認方法

```javascript
// 環境変数の確認
console.log("Environment variables check:", {
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  CRON_SECRET: !!process.env.CRON_SECRET,
});
```

#### 解決方法

1. **Vercelでの環境変数設定**
   - ダッシュボードで環境変数を確認
   - 本番環境とプレビュー環境の設定を分離
   - 機密情報の適切な管理

2. **環境別設定の実装**

   ```javascript
   // 環境別設定
   const config = {
     development: {
       allowDevMocks: true,
       logLevel: "debug",
     },
     production: {
       allowDevMocks: false,
       logLevel: "error",
     },
   };

   const currentConfig = config[process.env.NODE_ENV] || config.development;
   ```

## 7. 監視とアラート

### 7.1 ログ監視の設定

```javascript
// 構造化ログの実装
function logError(error, context) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: error.message,
      stack: error.stack,
      context,
      environment: process.env.NODE_ENV,
    }),
  );
}

// 使用例
try {
  await sendEmail(emailData);
} catch (error) {
  logError(error, {
    operation: "email_send",
    reservationId,
    emailType,
  });
}
```

### 7.2 ヘルスチェックの実装

```javascript
// ヘルスチェックエンドポイント
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    email: await checkEmailService(),
    memory: checkMemoryUsage(),
  };

  const isHealthy = Object.values(checks).every(
    (check) => check.status === "ok",
  );

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
  });
}
```

## 8. 緊急時の対応

### 8.1 サービス停止時の対応

1. **問題の特定**
   - ログの確認
   - 外部サービスの状態確認
   - データベースの状態確認

2. **一時的な回避策**
   - メンテナンスページの表示
   - 代替機能の提供
   - 手動処理への切り替え

3. **復旧作業**
   - 問題の修正
   - 段階的な復旧
   - 動作確認

### 8.2 データ整合性の問題

```sql
-- データ整合性チェック
SELECT
  r.id,
  r.customer_email,
  r.appointment_datetime,
  COUNT(e.id) as email_count
FROM reservations r
LEFT JOIN events e ON e.payload->>'reservation_id' = r.id::text
WHERE r.appointment_datetime > NOW()
GROUP BY r.id, r.customer_email, r.appointment_datetime
HAVING COUNT(e.id) = 0;
```

## 9. 予防策

### 9.1 定期的なメンテナンス

- [ ] 週次: ログの確認とクリーンアップ
- [ ] 月次: パフォーマンス指標の確認
- [ ] 四半期: セキュリティ監査
- [ ] 年次: 依存関係の更新

### 9.2 監視項目

- [ ] API応答時間
- [ ] エラー率
- [ ] メール配信成功率
- [ ] データベース接続状態
- [ ] メモリ使用量

## 10. サポート連絡先

### 10.1 外部サービス

- **Resend**: [サポートページ](https://resend.com/support)
- **Supabase**: [サポートページ](https://supabase.com/support)
- **Vercel**: [サポートページ](https://vercel.com/support)

### 10.2 内部エスカレーション

1. 開発チーム
2. インフラチーム
3. プロダクトマネージャー

---

このガイドは定期的に更新され、新しい問題や解決方法が追加されます。
