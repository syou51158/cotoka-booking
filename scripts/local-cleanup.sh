#!/bin/bash

# ローカル開発環境用 - 期限切れpending予約の自動削除
# 使用方法: ./scripts/local-cleanup.sh

echo "🧹 期限切れpending予約のクリーンアップを開始..."

while true; do
    # 現在時刻を表示
    echo "$(date '+%Y-%m-%d %H:%M:%S') - クリーンアップ実行中..."
    
    # クリーンアップAPIを呼び出し
    response=$(curl -s -X POST "http://localhost:3000/api/cron/pending-expired" -H "Content-Type: application/json")
    
    # レスポンスを表示
    echo "結果: $response"
    
    # 5分待機（300秒）
    echo "⏰ 5分後に再実行します..."
    sleep 300
done