# メール配信セットアップガイド

## 概要

このガイドでは、Cotoka Bookingアプリケーションでのメール配信機能のセットアップ方法について説明します。DKIM認証、SPF設定、メール配信の最適化について詳しく解説します。

## 前提条件

- Resendアカウントの作成
- ドメインの管理権限
- DNS設定の変更権限

## 1. Resendアカウントのセットアップ

### 1.1 アカウント作成
1. [Resend](https://resend.com)にアクセス
2. アカウントを作成
3. ダッシュボードにログイン

### 1.2 APIキーの取得
1. Resendダッシュボードで「API Keys」セクションに移動
2. 「Create API Key」をクリック
3. 適切な権限を設定（Send access推奨）
4. 生成されたAPIキーを安全に保存

## 2. ドメイン設定

### 2.1 ドメインの追加
1. Resendダッシュボードで「Domains」セクションに移動
2. 「Add Domain」をクリック
3. 使用するドメイン（例：yourdomain.com）を入力
4. 「Add Domain」をクリック

### 2.2 DNS設定の確認
ドメイン追加後、以下のDNSレコードが表示されます：

#### SPFレコード
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

#### DKIMレコード
```
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com
```

#### DMARCレコード（推奨）
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

## 3. DKIM設定の詳細手順

### 3.1 DNS管理画面での設定

#### Cloudflareの場合
1. Cloudflareダッシュボードにログイン
2. 対象ドメインを選択
3. 「DNS」タブに移動
4. 「Add record」をクリック
5. 以下の設定を入力：
   - Type: CNAME
   - Name: resend._domainkey
   - Target: resend._domainkey.resend.com
   - TTL: Auto
6. 「Save」をクリック

#### お名前.comの場合
1. お名前.com Naviにログイン
2. 「DNS設定/転送設定」を選択
3. 対象ドメインの「DNS設定」をクリック
4. 「DNSレコード設定を利用する」を選択
5. 以下のレコードを追加：
   - ホスト名: resend._domainkey
   - TYPE: CNAME
   - VALUE: resend._domainkey.resend.com
   - TTL: 3600
6. 「追加」をクリック

#### Route53の場合
1. AWS Route53コンソールにアクセス
2. 対象のホストゾーンを選択
3. 「Create record」をクリック
4. 以下の設定を入力：
   - Record name: resend._domainkey
   - Record type: CNAME
   - Value: resend._domainkey.resend.com
   - TTL: 300
5. 「Create records」をクリック

### 3.2 設定の確認

#### コマンドラインでの確認
```bash
# SPFレコードの確認
dig TXT yourdomain.com | grep spf

# DKIMレコードの確認
dig CNAME resend._domainkey.yourdomain.com

# DMARCレコードの確認
dig TXT _dmarc.yourdomain.com
```

#### オンラインツールでの確認
- [MXToolbox](https://mxtoolbox.com/dkim.aspx)
- [DKIM Validator](https://dkimvalidator.com/)
- [Mail Tester](https://www.mail-tester.com/)

## 4. 環境変数の設定

### 4.1 必要な環境変数
```env
# Resend API設定
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# CRON認証（本番環境）
CRON_SECRET=your-secure-cron-secret

# 管理者ドメイン制限（本番環境）
ADMIN_EMAIL_DOMAINS=yourdomain.com,admin.yourdomain.com

# 開発環境でのテスト許可
ALLOW_DEV_MOCKS=true
```

### 4.2 Vercelでの設定
1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」に移動
4. 上記の環境変数を追加

## 5. メール配信の最適化

### 5.1 送信者レピュテーション
- 一貫した送信者アドレスを使用
- 適切な送信頻度を維持
- バウンス率を低く保つ
- スパム報告を最小限に抑える

### 5.2 メールコンテンツの最適化
- 明確で関連性の高い件名
- HTMLとテキストの両方のバージョンを提供
- 適切な配信停止リンク
- モバイルフレンドリーなデザイン

### 5.3 配信タイミング
- 受信者のタイムゾーンを考慮
- 営業時間内の配信を推奨
- 過度な頻度での送信を避ける

## 6. 監視とメンテナンス

### 6.1 配信状況の監視
```bash
# Resendダッシュボードでの確認項目
- 配信成功率
- バウンス率
- 苦情率
- 開封率（オプション）
```

### 6.2 定期的なチェック項目
- [ ] DNS設定の有効性確認
- [ ] APIキーの有効期限確認
- [ ] 配信ログの確認
- [ ] エラー率の監視

### 6.3 アラート設定
```javascript
// 配信失敗率が高い場合のアラート例
if (failureRate > 0.05) {
  console.error('High email failure rate detected:', failureRate);
  // Slack通知やメール通知を送信
}
```

## 7. トラブルシューティング

### 7.1 よくある問題と解決方法

#### DKIM認証失敗
**症状**: メールが迷惑メールフォルダに入る、配信されない
**原因**: DKIM設定の不備
**解決方法**:
1. DNSレコードの設定を再確認
2. TTLの経過を待つ（最大48時間）
3. `dig`コマンドで設定を確認

#### SPF認証失敗
**症状**: メールが拒否される
**原因**: SPFレコードの設定ミス
**解決方法**:
1. SPFレコードの構文を確認
2. `include:_spf.resend.com`が含まれているか確認
3. 複数のSPFレコードがないか確認

#### 配信遅延
**症状**: メールの配信が遅い
**原因**: レート制限、サーバー負荷
**解決方法**:
1. 送信頻度を調整
2. バッチ処理の実装
3. Resendのステータスページを確認

### 7.2 デバッグ用コマンド

#### DNS設定の確認
```bash
# 全てのTXTレコードを確認
dig TXT yourdomain.com

# 特定のCNAMEレコードを確認
dig CNAME resend._domainkey.yourdomain.com

# MXレコードの確認
dig MX yourdomain.com
```

#### メール配信テスト
```bash
# curlを使用したテスト送信
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "test@yourdomain.com",
    "to": "recipient@example.com",
    "subject": "Test Email",
    "text": "This is a test email"
  }'
```

## 8. セキュリティ考慮事項

### 8.1 APIキーの管理
- 環境変数での管理
- 定期的なローテーション
- 最小権限の原則
- アクセスログの監視

### 8.2 メール内容のセキュリティ
- 個人情報の適切な取り扱い
- リンクの検証
- 添付ファイルのスキャン
- 暗号化の検討

## 9. パフォーマンス最適化

### 9.1 バッチ処理
```javascript
// 大量メール送信時のバッチ処理例
async function sendBatchEmails(emails, batchSize = 10) {
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    await Promise.all(batch.map(email => sendEmail(email)));
    
    // レート制限を避けるための待機
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### 9.2 キャッシュ戦略
- テンプレートのキャッシュ
- 設定値のキャッシュ
- DNS解決結果のキャッシュ

## 10. 参考リンク

- [Resend公式ドキュメント](https://resend.com/docs)
- [DKIM設定ガイド](https://resend.com/docs/dashboard/domains/dkim)
- [SPF設定ガイド](https://resend.com/docs/dashboard/domains/spf)
- [メール配信ベストプラクティス](https://resend.com/docs/best-practices)