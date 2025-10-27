# リマインダー自動化設定

## 概要

このドキュメントでは、Google Cloud Schedulerを使用してリマインダーメールの自動送信を設定する手順を説明します。

## 前提条件

- Google Cloud Projectが作成済み
- Cloud Scheduler APIが有効化済み
- アプリケーションがデプロイ済み（Vercel等）

## 環境変数設定

### 必須環境変数

```bash
# CRON認証用シークレット（本番環境で必須）
CRON_SECRET=your-secure-random-string

# 開発環境でのテスト用（本番では設定しない）
ALLOW_DEV_MOCKS=true
```

## Cloud Scheduler設定

### 1. Cloud Schedulerジョブ作成

```bash
# Google Cloud CLIでジョブを作成
gcloud scheduler jobs create http reminder-job \
  --schedule="*/15 * * * *" \
  --uri="https://your-app.vercel.app/api/cron/reminders" \
  --http-method=POST \
  --headers="x-cron-secret=your-secure-random-string" \
  --location=asia-northeast1
```

### 2. スケジュール設定例

| 頻度 | Cron式 | 説明 |
|------|--------|------|
| 15分毎 | `*/15 * * * *` | 推奨設定 |
| 10分毎 | `*/10 * * * *` | 高頻度 |
| 30分毎 | `*/30 * * * *` | 低頻度 |

## APIエンドポイント

### `/api/cron/reminders`

#### 認証

- **本番環境**: `x-cron-secret` ヘッダーが必須
- **開発環境**: `ALLOW_DEV_MOCKS=true` で認証スキップ可能

#### レスポンス例

```json
{
  "status": "ok",
  "sent": 5,
  "duration_ms": 1250,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### エラーレスポンス

```json
{
  "message": "error",
  "details": "Database connection failed",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 開発・テスト

### 開発環境でのテスト

```bash
# GETリクエストでテスト実行
curl http://localhost:3001/api/cron/reminders

# 時間をシフトしてテスト
curl "http://localhost:3001/api/cron/reminders?shiftMinutes=1440"

# ウィンドウ時間を調整してテスト
curl "http://localhost:3001/api/cron/reminders?window24m=30&window2m=15"
```

### パラメータ説明

- `shiftMinutes`: 基準時間をシフト（開発環境のみ）
- `window24m`: 24時間前リマインダーの送信ウィンドウ（分）
- `window2m`: 2時間前リマインダーの送信ウィンドウ（分）

## ログ監視

### 成功ログ例

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration_ms": 1250,
  "sent_count": 5,
  "status": "success",
  "reference_date": null,
  "window_minutes": {}
}
```

### エラーログ例

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "error",
  "error": "Database connection timeout"
}
```

## トラブルシューティング

### よくある問題

1. **認証エラー**
   - `CRON_SECRET` が正しく設定されているか確認
   - Cloud Schedulerのヘッダー設定を確認

2. **タイムアウト**
   - Cloud Schedulerのタイムアウト設定を延長
   - データベース接続プールの設定を確認

3. **重複送信**
   - スケジュール頻度を調整
   - リマインダー送信ロジックの冪等性を確認

### ログ確認方法

```bash
# Vercelでのログ確認
vercel logs --app=your-app-name

# Google Cloud Loggingでの確認
gcloud logging read "resource.type=cloud_scheduler_job"
```

## セキュリティ考慮事項

1. **CRON_SECRET**は十分に複雑な文字列を使用
2. 本番環境では`ALLOW_DEV_MOCKS`を設定しない
3. Cloud Schedulerのアクセス権限を適切に設定
4. ログに機密情報が含まれないよう注意

## 監視・アラート

### 推奨監視項目

- ジョブ実行成功率
- 実行時間（duration_ms）
- 送信メール数（sent_count）
- エラー発生頻度

### アラート設定例

```yaml
# Google Cloud Monitoring
- name: "Reminder Job Failure"
  condition: "error_count > 3 in 1h"
  notification: "email@example.com"

- name: "Reminder Job Timeout"
  condition: "duration_ms > 30000"
  notification: "slack-webhook"
```