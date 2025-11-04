"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { Mail, Send } from "lucide-react";

interface ResendEmailButtonProps {
  reservationId: string;
  customerEmail: string;
}

const EMAIL_TYPES = [
  { value: "confirmation", label: "予約確認メール" },
  { value: "24h", label: "24時間前リマインダー" },
  { value: "2h", label: "2時間前リマインダー" },
  { value: "cancel", label: "キャンセル通知" },
] as const;

export function ResendEmailButton({
  reservationId,
  customerEmail,
}: ResendEmailButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async () => {
    if (!selectedType) {
      showToast({ title: "メール種別を選択してください", variant: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/email/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId,
          kind: selectedType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 429) {
          // レート制限エラーの場合
          const retryAfter = response.headers.get("Retry-After");
          const retryMinutes = retryAfter
            ? Math.ceil(parseInt(retryAfter) / 60)
            : null;
          const message = retryMinutes
            ? `${errorData.error} (${retryMinutes}分後に再試行可能)`
            : errorData.error;
          showToast(message, "error");
        } else {
          showToast(errorData.error || "メール送信に失敗しました", "error");
        }
        return;
      }

      showToast({
        title: "メール再送完了",
        description: `${customerEmail} にメールを再送しました`,
        variant: "success",
      });
      setIsOpen(false);
      setSelectedType("");
    } catch (error) {
      console.error("Resend error:", error);
      showToast({
        title: "エラー",
        description: "メール送信中にエラーが発生しました",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-200"
        onClick={() => setIsOpen(true)}
      >
        <Mail className="h-4 w-4 mr-2" />
        メール再送
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative z-10 w-[95vw] max-w-md rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-200">
                メール再送
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-slate-300"
              >
                閉じる
              </Button>
            </div>

            <div className="mt-3 space-y-4">
              <div className="text-sm text-slate-400">
                {customerEmail} に送信するメールの種別を選択してください。
                <br />
                <span className="text-xs text-slate-500">
                  ※ 同一種別のメールは15分間隔でのみ送信可能です
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 block">
                  メール種別
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
                >
                  <option value="">選択してください</option>
                  {EMAIL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleResend}
                disabled={!selectedType || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {isLoading ? "送信中..." : "送信"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
