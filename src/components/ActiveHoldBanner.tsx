"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCountdown, formatMmSs } from "@/hooks/useCountdown";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/config";
import { showToast } from "@/lib/toast";

type HoldInfo = {
  reservationId: string;
  expiresAt: string; // ISO
  serviceName?: string;
  startAt?: string; // ISO
  serviceId?: string;
  staffId?: string;
  checkoutUrl?: string;
  status?: string; // finalized | canceled | (others)
};

export default function ActiveHoldBanner() {
  const [hold, setHold] = useState<HoldInfo | null>(null);
  const router = useRouter();

  // 成功ページなどからの通知を受け取り、バナーを非表示/更新する
  useEffect(() => {
    function loadFromStorage() {
      if (typeof window === "undefined") return;
      const key = "cotoka:reservation-hold";
      const raw = localStorage.getItem(key);
      if (!raw) {
        setHold(null);
        return;
      }
      try {
        const parsed: HoldInfo = JSON.parse(raw);

        // finalized / canceled は表示せず即削除
        if (parsed.status === "finalized" || parsed.status === "canceled") {
          localStorage.removeItem(key);
          setHold(null);
          return;
        }

        // expiresAt が無効 or 期限切れは削除
        if (!parsed.expiresAt) {
          localStorage.removeItem(key);
          setHold(null);
          return;
        }
        const exp = new Date(parsed.expiresAt).getTime();
        const now = Date.now();
        if (!Number.isFinite(exp) || exp <= now) {
          localStorage.removeItem(key);
          setHold(null);
          return;
        }

        setHold(parsed);
      } catch {
        localStorage.removeItem(key);
        setHold(null);
      }
    }

    // 初回読み込み
    loadFromStorage();

    // イベント購読
    function onCleared() {
      try {
        localStorage.removeItem("cotoka:reservation-hold");
      } catch {}
      setHold(null);
    }
    function onUpdated() {
      loadFromStorage();
    }

    try {
      window.addEventListener("cotoka:hold-cleared", onCleared);
      window.addEventListener("cotoka:hold-updated", onUpdated);
    } catch {}
    return () => {
      try {
        window.removeEventListener("cotoka:hold-cleared", onCleared);
        window.removeEventListener("cotoka:hold-updated", onUpdated);
      } catch {}
    };
  }, []);

  const secondsLeft = useCountdown(hold?.expiresAt);
  const eta = useMemo(() => {
    if (!hold?.expiresAt) return null;
    try {
      return formatInTimeZone(new Date(hold.expiresAt), TIMEZONE, "HH:mm");
    } catch {
      return null;
    }
  }, [hold?.expiresAt]);

  useEffect(() => {
    if (secondsLeft === 0 && hold) {
      try {
        localStorage.removeItem("cotoka:reservation-hold");
      } catch {}
      setHold(null);
      // グローバル通知（確認ページでアラート表示用）
      try {
        window.dispatchEvent(new CustomEvent("cotoka:hold-expired"));
      } catch {}
    }
  }, [secondsLeft, hold]);

  const handleClick = useCallback(() => {
    try {
      const raw = localStorage.getItem("cotoka:reservation-hold");
      if (!raw) return;
      const parsed: HoldInfo = JSON.parse(raw);
      if (parsed.status === "finalized" || parsed.status === "canceled") {
        localStorage.removeItem("cotoka:reservation-hold");
        showToast({
          title: "この保留はすでに無効です",
          description: "もう一度メニューと日時をお選びください。",
          variant: "error",
        });
        return;
      }
      const exp = new Date(parsed.expiresAt).getTime();
      if (!Number.isFinite(exp) || exp <= Date.now()) {
        localStorage.removeItem("cotoka:reservation-hold");
        showToast({
          title: "ご予約の保留が時間切れになりました",
          description: "もう一度メニューと日時をお選びください。",
          variant: "error",
        });
        return;
      }
      if (!parsed.serviceId || !parsed.reservationId) return;
      router.push(
        `/ja/booking/${encodeURIComponent(parsed.serviceId)}/confirm?rid=${encodeURIComponent(parsed.reservationId)}&from=hold`,
      );
    } catch {
      // ignore
    }
  }, [router]);

  if (!hold || secondsLeft == null) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="sticky top-0 z-50 w-full border-b border-amber-200 bg-amber-50/95 backdrop-blur"
    >
      <div className="mx-auto max-w-5xl px-4 py-2 text-left text-sm text-amber-800">
        今ご予約中の枠を {eta ?? "--:--"} まで一時的に確保しています（残り{" "}
        {formatMmSs(secondsLeft)}）。お支払いを完了すると確定します。▶
        この予約の画面に戻る
      </div>
    </button>
  );
}
