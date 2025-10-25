"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PaymentConfirm({
  rid,
  csId,
}: {
  rid: string;
  csId: string;
}) {
  const [status, setStatus] = useState<"checking" | "success" | "error">(
    "checking",
  );
  const [retrying, setRetrying] = useState(false);

  const runCheck = async () => {
    try {
      const res = await fetch(
        `/api/stripe/confirm?rid=${encodeURIComponent(rid)}&cs_id=${encodeURIComponent(csId)}`,
        { method: "GET" },
      );
      if (!res.ok) throw new Error("confirm failed");
      setStatus("success");
    } catch (e) {
      setStatus("error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      await runCheck();
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [rid, csId]);

  const handleRetry = async () => {
    setRetrying(true);
    await runCheck();
    setRetrying(false);
  };

  return (
    <div className="rounded border p-3 text-sm" aria-live="polite">
      {status === "checking" ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>お支払いを確認しています…</span>
        </div>
      ) : null}
      {status === "success" ? (
        <p className="text-emerald-700">お支払いを確認しました。</p>
      ) : null}
      {status === "error" ? (
        <div className="space-y-2">
          <p className="text-red-600">確認に時間がかかっています。しばらくしてから再試行してください。</p>
          <div className="flex gap-2">
            <Button onClick={handleRetry} disabled={retrying} className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110">
              <RotateCcw className="mr-1 h-4 w-4" /> 再試行
            </Button>
            <Button asChild variant="secondary">
              <Link href="/manage">本人確認ページへ</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}