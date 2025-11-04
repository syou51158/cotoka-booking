# Google Cloud Scheduler設定ガイド

## 概要

Cotoka Bookingアプリケーションの自動リマインダー機能を実現するため、Google Cloud Schedulerを使用してCRONジョブを設定する手順を説明します。

## 目次

1. [前提条件](#1-前提条件)
2. [Google Cloud Projectの設定](#2-google-cloud-projectの設定)
3. [Cloud Schedulerの有効化](#3-cloud-schedulerの有効化)
4. [CRONジョブの作成](#4-cronジョブの作成)
5. [認証の設定](#5-認証の設定)
6. [動作確認](#6-動作確認)
7. [監視とメンテナンス](#7-監視とメンテナンス)
8. [トラブルシューティング](#8-トラブルシューティング)

## 1. 前提条件

### 1.1 必要なアカウント・権限

- Google Cloudアカウント
- プロジェクトの編集者権限以上
- 課金アカウントの設定（Cloud Schedulerは有料サービス）

### 1.2 必要な情報

- アプリケーションのURL（例：`https://your-app.vercel.app`）
- CRON認証用のシークレットキー
- 実行したいCRONジョブのエンドポイント

## 2. Google Cloud Projectの設定

### 2.1 新しいプロジェクトの作成（必要に応じて）

```bash
# Google Cloud CLIを使用する場合
gcloud projects create cotoka-booking-scheduler \
  --name="Cotoka Booking Scheduler"

# プロジェクトを選択
gcloud config set project cotoka-booking-scheduler
```

### 2.2 課金の有効化

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「課金」→「課金アカウントをリンク」
4. 課金アカウントを選択して有効化

## 3. Cloud Schedulerの有効化

### 3.1 APIの有効化

```bash
# Cloud Scheduler APIを有効化
gcloud services enable cloudscheduler.googleapis.com

# App Engine APIも有効化（Cloud Schedulerで必要）
gcloud services enable appengine.googleapis.com
```

### 3.2 App Engineアプリケーションの作成

Cloud SchedulerはApp Engineリージョンを必要とします。

```bash
# App Engineアプリケーションを作成
gcloud app create --region=asia-northeast1
```

**注意**: リージョンは後から変更できません。日本のユーザーには`asia-northeast1`（東京）を推奨します。

## 4. CRONジョブの作成

### 4.1 リマインダー送信ジョブの作成

#### 4.1.1 基本的なジョブ作成

```bash
# 5分ごとに実行するリマインダージョブ
gcloud scheduler jobs create http reminder-job \
  --schedule="*/5 * * * *" \
  --uri="https://your-app.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer YOUR_CRON_SECRET" \
  --time-zone="Asia/Tokyo" \
  --description="Send appointment reminders"
```

#### 4.1.2 詳細設定付きジョブ作成

```bash
gcloud scheduler jobs create http reminder-job-detailed \
  --schedule="*/5 * * * *" \
  --uri="https://your-app.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer YOUR_CRON_SECRET,User-Agent=Google-Cloud-Scheduler" \
  --body='{"source":"cloud-scheduler","timestamp":"{{.timestamp}}"}' \
  --time-zone="Asia/Tokyo" \
  --description="Send appointment reminders with detailed logging" \
  --max-retry-attempts=3 \
  --max-retry-duration=300s \
  --max-doublings=3 \
  --min-backoff-duration=5s \
  --max-backoff-duration=300s
```

### 4.2 スケジュール設定の詳細

#### 4.2.1 CRON式の例

```bash
# 毎分実行（テスト用）
--schedule="* * * * *"

# 5分ごと実行（推奨）
--schedule="*/5 * * * *"

# 10分ごと実行
--schedule="*/10 * * * *"

# 毎時0分に実行
--schedule="0 * * * *"

# 平日の営業時間のみ（9-18時、月-金）
--schedule="*/5 9-18 * * 1-5"

# 特定の時間のみ（例：9:00, 12:00, 15:00, 18:00）
--schedule="0 9,12,15,18 * * *"
```

#### 4.2.2 タイムゾーンの設定

```bash
# 日本時間
--time-zone="Asia/Tokyo"

# UTC
--time-zone="UTC"

# アメリカ東部時間
--time-zone="America/New_York"
```

### 4.3 複数ジョブの設定例

#### 4.3.1 本番環境用（5分間隔）

```bash
gcloud scheduler jobs create http reminder-production \
  --schedule="*/5 * * * *" \
  --uri="https://cotoka-booking.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="Asia/Tokyo" \
  --description="Production reminder job - 5 minute intervals"
```

#### 4.3.2 ステージング環境用（10分間隔）

```bash
gcloud scheduler jobs create http reminder-staging \
  --schedule="*/10 * * * *" \
  --uri="https://cotoka-booking-staging.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer ${STAGING_CRON_SECRET}" \
  --time-zone="Asia/Tokyo" \
  --description="Staging reminder job - 10 minute intervals"
```

#### 4.3.3 開発環境用（手動実行のみ）

```bash
gcloud scheduler jobs create http reminder-development \
  --schedule="0 0 31 2 *" \
  --uri="https://cotoka-booking-dev.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer ${DEV_CRON_SECRET}" \
  --time-zone="Asia/Tokyo" \
  --description="Development reminder job - manual execution only"
```

## 5. 認証の設定

### 5.1 CRON_SECRETの生成

```bash
# 強力なランダムシークレットの生成
openssl rand -base64 32

# または
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5.2 環境変数の設定

#### 5.2.1 Vercelでの設定

```bash
# Vercel CLIを使用
vercel env add CRON_SECRET

# または、Vercelダッシュボードで設定
# 1. プロジェクト設定 → Environment Variables
# 2. Name: CRON_SECRET
# 3. Value: 生成したシークレット
# 4. Environment: Production, Preview, Development
```

#### 5.2.2 ローカル開発環境

```bash
# .env.localファイルに追加
echo "CRON_SECRET=your-generated-secret" >> .env.local
```

### 5.3 IPアドレス制限（オプション）

Google Cloud SchedulerのIPアドレス範囲を制限したい場合：

```javascript
// /api/cron/reminders/route.ts
const ALLOWED_IPS = [
  '0.1.0.1',    // Google Cloud Scheduler IP範囲
  '0.1.0.2',    // （実際のIPは Google Cloud ドキュメントを参照）
];

export async function POST(request: NextRequest) {
  const clientIP = request.ip || request.headers.get('x-forwarded-for');

  if (!ALLOWED_IPS.includes(clientIP)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 既存の処理...
}
```

## 6. 動作確認

### 6.1 手動実行によるテスト

```bash
# ジョブの手動実行
gcloud scheduler jobs run reminder-job

# 実行結果の確認
gcloud scheduler jobs describe reminder-job
```

### 6.2 ログの確認

```bash
# Cloud Schedulerのログ確認
gcloud logging read "resource.type=cloud_scheduler_job" \
  --limit=10 \
  --format="table(timestamp,severity,textPayload)"

# 特定のジョブのログ
gcloud logging read "resource.type=cloud_scheduler_job AND resource.labels.job_id=reminder-job" \
  --limit=10
```

### 6.3 アプリケーション側での確認

```bash
# エンドポイントの直接テスト
curl -X POST "https://your-app.vercel.app/api/cron/reminders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -d '{"test": true}'
```

### 6.4 Vercelのログ確認

```bash
# Vercel CLIでログ確認
vercel logs --follow

# または、Vercelダッシュボードの Functions タブでログを確認
```

## 7. 監視とメンテナンス

### 7.1 アラートの設定

#### 7.1.1 Cloud Monitoringでのアラート

```bash
# アラートポリシーの作成（CLI例）
gcloud alpha monitoring policies create \
  --policy-from-file=scheduler-alert-policy.yaml
```

`scheduler-alert-policy.yaml`の例：

```yaml
displayName: "Cloud Scheduler Job Failures"
conditions:
  - displayName: "Job failure rate"
    conditionThreshold:
      filter: 'resource.type="cloud_scheduler_job"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0
      duration: 300s
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_SUM
notificationChannels:
  - "projects/YOUR_PROJECT/notificationChannels/YOUR_CHANNEL_ID"
```

#### 7.1.2 メール通知の設定

```bash
# 通知チャンネルの作成
gcloud alpha monitoring channels create \
  --display-name="Email Notifications" \
  --type=email \
  --channel-labels=email_address=admin@yourdomain.com
```

### 7.2 定期的なメンテナンス

#### 7.2.1 ジョブの状態確認

```bash
# 全ジョブの状態確認
gcloud scheduler jobs list

# 特定ジョブの詳細確認
gcloud scheduler jobs describe reminder-job
```

#### 7.2.2 実行履歴の確認

```bash
# 過去24時間の実行履歴
gcloud logging read "resource.type=cloud_scheduler_job" \
  --freshness=1d \
  --format="table(timestamp,severity,resource.labels.job_id,textPayload)"
```

### 7.3 パフォーマンス監視

```bash
# 実行時間の監視
gcloud logging read "resource.type=cloud_scheduler_job" \
  --filter="textPayload:duration" \
  --limit=50
```

## 8. トラブルシューティング

### 8.1 よくある問題と解決方法

#### 8.1.1 ジョブが実行されない

**症状**: スケジュールされた時間にジョブが実行されない

**確認方法**:

```bash
# ジョブの状態確認
gcloud scheduler jobs describe reminder-job

# 最近のログ確認
gcloud logging read "resource.type=cloud_scheduler_job AND resource.labels.job_id=reminder-job" --limit=5
```

**解決方法**:

1. ジョブが有効化されているか確認
2. スケジュール設定の確認
3. タイムゾーン設定の確認

#### 8.1.2 HTTP 401/403エラー

**症状**: 認証エラーでジョブが失敗する

**確認方法**:

```bash
# エラーログの確認
gcloud logging read "resource.type=cloud_scheduler_job AND severity=ERROR" --limit=10
```

**解決方法**:

1. CRON_SECRETの確認
2. Authorizationヘッダーの設定確認
3. アプリケーション側の認証ロジック確認

#### 8.1.3 HTTP 500エラー

**症状**: アプリケーション内部エラー

**確認方法**:

```bash
# Vercelログの確認
vercel logs --follow

# または手動でエンドポイントをテスト
curl -X POST "https://your-app.vercel.app/api/cron/reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -v
```

**解決方法**:

1. アプリケーションログの詳細確認
2. データベース接続の確認
3. 環境変数の設定確認

### 8.2 デバッグ用のテストジョブ

```bash
# デバッグ用の頻繁実行ジョブ（一時的に使用）
gcloud scheduler jobs create http debug-reminder \
  --schedule="* * * * *" \
  --uri="https://your-app.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer YOUR_CRON_SECRET,X-Debug=true" \
  --time-zone="Asia/Tokyo" \
  --description="Debug job - delete after testing"

# テスト完了後は削除
gcloud scheduler jobs delete debug-reminder
```

### 8.3 ログ分析のためのクエリ

```bash
# 成功率の確認
gcloud logging read "resource.type=cloud_scheduler_job" \
  --filter="timestamp>=2024-01-01T00:00:00Z" \
  --format="value(severity)" | sort | uniq -c

# 実行時間の分析
gcloud logging read "resource.type=cloud_scheduler_job" \
  --filter="textPayload:duration" \
  --format="value(textPayload)" | grep -o "duration: [0-9.]*s"
```

## 9. セキュリティ考慮事項

### 9.1 認証の強化

```javascript
// より強固な認証の実装例
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  // タイミング攻撃を防ぐための定数時間比較
  if (!authHeader || !timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expectedAuth)
  )) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 追加のセキュリティチェック
  const userAgent = request.headers.get('user-agent');
  if (!userAgent?.includes('Google-Cloud-Scheduler')) {
    return NextResponse.json({ error: 'Invalid user agent' }, { status: 403 });
  }

  // 既存の処理...
}
```

### 9.2 レート制限の実装

```javascript
// Cloud Scheduler専用のレート制限
const schedulerRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 20, // 最大20回/分
  keyGenerator: () => "cloud-scheduler",
  message: "Too many scheduler requests",
});
```

### 9.3 ログの機密情報保護

```javascript
// 機密情報をログに出力しないよう注意
function logSchedulerEvent(event, data) {
  const sanitizedData = {
    ...data,
    // 機密情報を除外
    authorization: "[REDACTED]",
    email: data.email
      ? data.email.replace(/(.{2}).*(@.*)/, "$1***$2")
      : undefined,
  };

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      source: "cloud-scheduler",
      event,
      data: sanitizedData,
    }),
  );
}
```

## 10. コスト最適化

### 10.1 料金体系の理解

- Cloud Scheduler: $0.10 per job per month（最初の3ジョブは無料）
- 実行回数による追加料金なし
- App Engine: 最小インスタンス料金が発生する場合あり

### 10.2 コスト削減のベストプラクティス

1. **適切な実行間隔の設定**

   ```bash
   # 過度に頻繁な実行を避ける
   # 5分間隔で十分な場合は1分間隔にしない
   --schedule="*/5 * * * *"  # Good
   --schedule="* * * * *"    # 避けるべき（コスト高）
   ```

2. **不要なジョブの削除**

   ```bash
   # 使用していないジョブの確認
   gcloud scheduler jobs list

   # 不要なジョブの削除
   gcloud scheduler jobs delete unused-job
   ```

3. **リージョンの最適化**
   ```bash
   # 最も近いリージョンを選択
   # 日本: asia-northeast1
   # アメリカ: us-central1
   ```

## 11. 高可用性の設定

### 11.1 複数リージョンでの冗長化

```bash
# プライマリリージョン（東京）
gcloud scheduler jobs create http reminder-primary \
  --schedule="*/5 * * * *" \
  --uri="https://your-app.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET},X-Region=primary" \
  --time-zone="Asia/Tokyo"

# セカンダリリージョン（大阪）- 異なるプロジェクトで設定
gcloud scheduler jobs create http reminder-secondary \
  --schedule="*/5 * * * *" \
  --uri="https://your-app.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET},X-Region=secondary" \
  --time-zone="Asia/Tokyo"
```

### 11.2 フェイルオーバーの実装

```javascript
// アプリケーション側でのフェイルオーバー処理
export async function POST(request: NextRequest) {
  const region = request.headers.get('x-region') || 'primary';

  // プライマリリージョンからの実行のみ処理
  if (region === 'secondary') {
    // プライマリの健全性をチェック
    const primaryHealthy = await checkPrimaryHealth();
    if (primaryHealthy) {
      return NextResponse.json({
        message: 'Primary is healthy, skipping secondary execution'
      });
    }
  }

  // 通常の処理を実行
  return await processReminders();
}
```

## 12. 参考リンク

- [Google Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [CRON式の詳細](https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules)
- [Cloud Monitoring](https://cloud.google.com/monitoring/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

このガイドに従って設定することで、信頼性の高い自動リマインダーシステムを構築できます。問題が発生した場合は、トラブルシューティングセクションを参照してください。
