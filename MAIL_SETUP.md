# メール送信設定ガイド

## 概要

Cotoka Booking システムでは、以下のメール送信機能を提供しています：

- 予約確認メール（決済完了時）
- リマインダーメール（24時間前、2時間前）
- テストメール送信（開発用）

## Resend設定手順

### 1. Resendアカウントの作成

1. [Resend](https://resend.com) にアクセス
2. アカウントを作成
3. ドメインを追加・認証（詳細は下記参照）

### 2. ドメイン認証設定（DKIM）

#### 2.1 Resendでのドメイン追加

1. Resendダッシュボードで「Domains」に移動
2. 「Add Domain」をクリック
3. `cotoka.jp` を入力して追加

#### 2.2 DNS設定（ムームードメイン）

Resendでドメイン追加後、以下のDNSレコードが表示されます：

**必要なCNAMEレコード例：**

```
# DKIM認証用
resend._domainkey.cotoka.jp → resend1._domainkey.resend.com
resend2._domainkey.cotoka.jp → resend2._domainkey.resend.com

# SPF/DMARC（TXTレコード）
cotoka.jp → "v=spf1 include:_spf.resend.com ~all"
_dmarc.cotoka.jp → "v=DMARC1; p=quarantine; rua=mailto:dmarc@cotoka.jp"
```

**ムームードメインでの設定手順：**

1. [ムームードメイン](https://muumuu-domain.com) にログイン
2. 「ドメイン管理」→「DNS設定」を選択
3. `cotoka.jp` を選択
4. 「カスタム設定」を選択
5. 以下のレコードを追加：

| サブドメイン         | 種別  | 内容                                                 |
| -------------------- | ----- | ---------------------------------------------------- |
| `resend._domainkey`  | CNAME | `resend1._domainkey.resend.com`                      |
| `resend2._domainkey` | CNAME | `resend2._domainkey.resend.com`                      |
| `@`                  | TXT   | `v=spf1 include:_spf.resend.com ~all`                |
| `_dmarc`             | TXT   | `v=DMARC1; p=quarantine; rua=mailto:dmarc@cotoka.jp` |

6. 「設定」をクリックして保存

#### 2.3 認証確認

1. DNS設定後、15分〜1時間程度で反映
2. Resendダッシュボードで「Verify」をクリック
3. ステータスが「Verified」になることを確認

**確認コマンド（ローカル）：**

```bash
# DKIM確認
dig TXT resend._domainkey.cotoka.jp
dig TXT resend2._domainkey.cotoka.jp

# SPF確認
dig TXT cotoka.jp

# DMARC確認
dig TXT _dmarc.cotoka.jp
```

### 3. APIキーの取得

1. Resendダッシュボードで「API Keys」に移動
2. 新しいAPIキーを作成
3. 適切な権限（Send emails）を設定

### 4. 環境変数の設定

`.env.local` または本番環境の環境変数に以下を設定：

```bash
# メール送信設定
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
NOTIFY_FROM_EMAIL=info@cotoka.jp

# 開発環境でのドライラン有効化（本番では false）
ALLOW_DEV_MOCKS=false
```

**メール送信者設定：**

- **From:** `"Cotoka" <info@cotoka.jp>` （表示名付き）
- **Reply-To:** `info@cotoka.jp` （返信先統一）

これにより、受信者には「Cotoka」として表示され、返信は `info@cotoka.jp` に届きます。

## 設定確認

### ヘルスチェック

```bash
curl http://localhost:3001/api/health/email
```

期待される応答：

```json
{
  "status": "ok",
  "message": "Email provider is configured and reachable",
  "config": {
    "hasResendKey": true,
    "hasFromEmail": true,
    "fromEmailMasked": "in***@cotoka.jp",
    "canSend": true
  }
}
```

### テストメール送信

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "テスト", "content": "テストメッセージ"}' \
  http://localhost:3001/api/dev/test-email
```

## 本番環境での注意事項

### 1. セキュリティ

- `RESEND_API_KEY` は環境変数で管理し、コードにハードコードしない
- 送信元メールアドレス（`NOTIFY_FROM_EMAIL`）は認証済みドメインを使用

### 2. 監視

- Resendダッシュボードで送信ログを監視
- `events` テーブルで送信履歴を確認
- 失敗時のアラート設定を推奨

### 3. 制限事項

- Resendの送信制限を確認
- 必要に応じて送信レート制限を実装

## トラブルシューティング

### メール送信が失敗する場合

1. **設定確認**

   ```bash
   curl http://localhost:3001/api/health/email
   ```

2. **ログ確認**

   ```sql
   SELECT type, payload, created_at
   FROM events
   WHERE type LIKE '%email%'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **よくある問題**
   - APIキーが無効または期限切れ
   - 送信元ドメインが未認証
   - 送信制限に達している

### ドライランモード

開発環境では `ALLOW_DEV_MOCKS=true` を設定することで、実際にメールを送信せずに動作をテストできます。

```bash
# ドライランでの予約確認メール送信テスト
curl "http://localhost:3001/api/dev/mock/checkout-complete?rid=RESERVATION_ID"
```

## リマインダー自動化

### Cron設定例

```bash
# 15分間隔でリマインダーをチェック
*/15 * * * * curl -H "x-cron-secret: YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/reminders
```

### GitHub Actions例

```yaml
name: reservation-reminders
on:
  schedule:
    - cron: "*/15 * * * *"
jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send reminders
        run: |
          curl -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/reminders
```

## 関連ファイル

- `/src/server/notifications.ts` - メール送信ロジック
- `/src/app/api/health/email/route.ts` - ヘルスチェック
- `/src/app/api/dev/test-email/route.ts` - テスト送信
- `/src/app/api/cron/reminders/route.ts` - リマインダー送信
