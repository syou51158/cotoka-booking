import { createSupabaseServiceRoleClient } from "@/lib/supabase";

export interface IdempotencyCheck {
  isAllowed: boolean;
  reason?: string;
  lastSentAt?: string;
}

/**
 * メール再送の冪等性をチェック
 * 同じ予約・同じ種別のメールが短時間で重複送信されることを防ぐ
 */
export async function checkEmailIdempotency(
  reservationId: string,
  emailType: string,
  minimumIntervalMinutes: number = 15,
): Promise<IdempotencyCheck> {
  const supabase = createSupabaseServiceRoleClient();

  try {
    // 最近のメール送信履歴を確認
    const { data: recentEmails, error } = await supabase
      .from("events")
      .select("created_at, payload")
      .eq("type", "email_sent")
      .gte(
        "created_at",
        new Date(Date.now() - minimumIntervalMinutes * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to check email idempotency:", error);
      // エラーの場合は安全側に倒して送信を許可
      return { isAllowed: true };
    }

    // 同じ予約IDと種別のメールが最近送信されているかチェック
    const duplicateEmail = recentEmails?.find((event) => {
      const payload = event.payload as any;
      return (
        payload?.reservation_id === reservationId &&
        (payload?.email_type === emailType || payload?.kind === emailType)
      );
    });

    if (duplicateEmail) {
      const lastSentAt = new Date(duplicateEmail.created_at).toISOString();
      const minutesAgo = Math.floor(
        (Date.now() - new Date(duplicateEmail.created_at).getTime()) /
          (1000 * 60),
      );

      return {
        isAllowed: false,
        reason: `同じ種別のメールが${minutesAgo}分前に送信済みです`,
        lastSentAt,
      };
    }

    return { isAllowed: true };
  } catch (error) {
    console.error("Error checking email idempotency:", error);
    // エラーの場合は安全側に倒して送信を許可
    return { isAllowed: true };
  }
}

/**
 * リクエストの冪等性をチェック（リクエストIDベース）
 */
export async function checkRequestIdempotency(
  requestId: string,
  expirationMinutes: number = 60,
): Promise<IdempotencyCheck> {
  const supabase = createSupabaseServiceRoleClient();

  try {
    // リクエストIDの履歴を確認
    const { data: existingRequests, error } = await supabase
      .from("events")
      .select("created_at, payload")
      .eq("type", "api_request")
      .gte(
        "created_at",
        new Date(Date.now() - expirationMinutes * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to check request idempotency:", error);
      return { isAllowed: true };
    }

    const duplicateRequest = existingRequests?.find((event) => {
      const payload = event.payload as any;
      return payload?.request_id === requestId;
    });

    if (duplicateRequest) {
      return {
        isAllowed: false,
        reason: "重複リクエストです",
        lastSentAt: duplicateRequest.created_at,
      };
    }

    return { isAllowed: true };
  } catch (error) {
    console.error("Error checking request idempotency:", error);
    return { isAllowed: true };
  }
}

/**
 * リクエストIDを記録
 */
export async function recordRequestId(
  requestId: string,
  reservationId: string,
  additionalData?: Record<string, any>,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  try {
    await supabase.from("events").insert({
      type: "api_request",
      payload: {
        request_id: requestId,
        reservation_id: reservationId,
        timestamp: new Date().toISOString(),
        ...additionalData,
      },
    });
  } catch (error) {
    console.error("Failed to record request ID:", error);
    // 記録失敗は処理を止めない
  }
}
