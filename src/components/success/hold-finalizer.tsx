"use client";

import { useEffect } from "react";

export default function HoldFinalizer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("cotoka:reservation-hold");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          parsed.status = "finalized";
          localStorage.setItem(
            "cotoka:reservation-hold",
            JSON.stringify(parsed),
          );
        } catch (e) {
          localStorage.removeItem("cotoka:reservation-hold");
        }
      }
    } finally {
      try {
        window.dispatchEvent(new Event("cotoka:hold-cleared"));
      } catch {}
    }
  }, []);

  return null;
}
