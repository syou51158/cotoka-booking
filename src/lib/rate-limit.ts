import { NextRequest } from 'next/server';

// レート制限のストレージ（本番環境ではRedisを推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  windowMs: number; // 時間窓（ミリ秒）
  maxRequests: number; // 最大リクエスト数
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * IPアドレスベースのレート制限
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): RateLimitResult {
  const ip = getClientIP(request);
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  
  // 既存のレート制限データを取得
  const existing = rateLimitStore.get(key);
  
  // 時間窓がリセットされた場合
  if (!existing || now > existing.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime
    };
  }
  
  // リクエスト数が上限を超えた場合
  if (existing.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: existing.resetTime
    };
  }
  
  // リクエスト数を増加
  existing.count++;
  rateLimitStore.set(key, existing);
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime
  };
}

/**
 * 特定のキーに対するレート制限（メール再送用）
 */
export function checkEmailResendRateLimit(
  reservationId: string,
  emailType: string
): RateLimitResult {
  const key = `email_resend:${reservationId}:${emailType}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15分
  const maxRequests = 1; // 15分間に1回まで
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || now > existing.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    
    return {
      success: true,
      limit: maxRequests,
      remaining: 0,
      resetTime
    };
  }
  
  return {
    success: false,
    limit: maxRequests,
    remaining: 0,
    resetTime: existing.resetTime
  };
}

/**
 * クライアントIPアドレスを取得
 */
function getClientIP(request: NextRequest): string {
  // Vercelの場合
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // その他のヘッダーをチェック
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Cloudflareの場合
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // フォールバック
  return 'unknown';
}

/**
 * レート制限のクリーンアップ（期限切れエントリを削除）
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// 定期的なクリーンアップ（5分毎）
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}