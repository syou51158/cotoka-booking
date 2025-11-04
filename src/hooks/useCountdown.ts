"use client";
import { useEffect, useState } from "react";

export function useCountdown(targetIso?: string) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.floor((target - now) / 1000);
      setSecondsLeft(diff > 0 ? diff : 0);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return secondsLeft;
}

export function formatMmSs(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "00:00";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const mmStr = String(mm).padStart(2, "0");
  const ssStr = String(ss).padStart(2, "0");
  return `${mmStr}:${ssStr}`;
}
