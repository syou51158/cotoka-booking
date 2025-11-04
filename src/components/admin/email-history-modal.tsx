"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface EmailHistoryItem {
  id: string;
  type: string;
  created_at: string;
  details: {
    email_type?: string;
    recipient?: string;
    message_id?: string;
    provider?: string;
    source?: string;
    error_message?: string;
  };
}

interface Props {
  reservationId: string;
}

export default function EmailHistoryModal({ reservationId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EmailHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/email-history?rid=${reservationId}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "failed");
        setItems((data?.items ?? []) as EmailHistoryItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, reservationId]);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-200"
        onClick={() => setOpen(true)}
      >
        送信履歴
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-[95vw] max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-200">
                メール送信履歴
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-slate-300"
              >
                閉じる
              </Button>
            </div>
            <div className="mt-3">
              {loading ? (
                <p className="text-sm text-slate-400">読み込み中...</p>
              ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-400">送信履歴はありません。</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded border border-slate-800 bg-slate-950/50 p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-200">
                                {formatEmailType(item.details.email_type)}
                              </span>
                              <Badge
                                variant={
                                  item.type === "email_sent"
                                    ? "default"
                                    : "destructive"
                                }
                                className={
                                  item.type === "email_sent"
                                    ? "bg-emerald-700/70 text-emerald-100"
                                    : "bg-red-700/70 text-red-100"
                                }
                              >
                                {item.type === "email_sent"
                                  ? "送信成功"
                                  : "送信失敗"}
                              </Badge>
                              {item.details.source && (
                                <Badge
                                  variant="outline"
                                  className="border-slate-600 text-slate-300"
                                >
                                  {formatSource(item.details.source)}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              <div>
                                日時:{" "}
                                {format(
                                  new Date(item.created_at),
                                  "yyyy/MM/dd HH:mm:ss",
                                )}
                              </div>
                              {item.details.recipient && (
                                <div>宛先: {item.details.recipient}</div>
                              )}
                              {item.details.provider && (
                                <div>プロバイダー: {item.details.provider}</div>
                              )}
                              {item.details.message_id && (
                                <div>
                                  Message-ID:{" "}
                                  {maskMessageId(item.details.message_id)}
                                </div>
                              )}
                              {item.details.error_message && (
                                <div className="text-red-400">
                                  エラー: {item.details.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatEmailType(type?: string): string {
  switch (type) {
    case "confirmation":
      return "予約確認";
    case "24h":
      return "24時間前リマインダー";
    case "2h":
      return "2時間前リマインダー";
    case "cancel":
      return "キャンセル通知";
    default:
      return type || "不明";
  }
}

function formatSource(source?: string): string {
  switch (source) {
    case "stripe_webhook":
      return "自動送信";
    case "admin_resend":
      return "管理者再送";
    case "cron_reminder":
      return "自動リマインダー";
    default:
      return source || "不明";
  }
}

function maskMessageId(messageId: string): string {
  if (messageId.length <= 8) return messageId;
  return (
    messageId.substring(0, 4) +
    "..." +
    messageId.substring(messageId.length - 4)
  );
}
