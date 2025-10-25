"use client";

import { useEffect, useState } from "react";
import { subscribeToast, type ToastMessage } from "@/lib/toast";

export default function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToast((msg) => {
      setItems((prev) => [...prev, msg]);
      const timeout = setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== msg.id));
      }, 3500);
      // auto-dismiss only; no cleanup return here
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={
            "pointer-events-auto rounded border px-3 py-2 text-sm shadow-md " +
            (item.variant === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : item.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700")
          }
        >
          {item.title ? (
            <div className="font-semibold">{item.title}</div>
          ) : null}
          {item.description ? (
            <div className="text-xs opacity-80">{item.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}