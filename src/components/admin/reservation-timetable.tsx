"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Staff = { id: string; display_name: string; color?: string | null };

// ... (inside component)

type Reservation = {
  id: string;
  staff?: { id: string; display_name: string } | null;
  staff_id?: string | null;
  start_at: string;
  end_at: string;
  status: string;
  service?: { name: string; duration_min?: number } | null;
  customer_name?: string | null;
  notes?: string | null;
};
type Shift = {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  note?: string | null;
  staff?: { id: string; name: string };
};

type StaffBlock = {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  block_type: "task" | "break" | "walk_in";
  note?: string | null;
  staff?: { id: string; name: string };
};

type OpeningHours = { open_at: string; close_at: string; is_open: boolean } | null;

type Props = {
  day: Date;
  staff: Staff[];
  reservations: Reservation[];
  shifts: Shift[];
  blocks?: StaffBlock[];
  openingHours: OpeningHours;
  snapMinutes?: number;
};

export default function AdminReservationTimetable({
  day,
  staff,
  reservations,
  shifts,
  blocks = [],
  openingHours,
  snapMinutes = 15,
}: Props) {
  const router = useRouter();
  const [showShifts, setShowShifts] = useState(true);
  const [showBlocks, setShowBlocks] = useState(true);
  const [resolveOverlap, setResolveOverlap] = useState(true);
  const [creationEnabled, setCreationEnabled] = useState(false);
  const [reservationsLocal, setReservationsLocal] = useState(reservations);
  useEffect(() => setReservationsLocal(reservations), [reservations]);
  const range = useMemo(() => {
    if (!openingHours || !openingHours.is_open) return null;
    const [oh, om] = openingHours.open_at.split(":").map((n) => parseInt(n, 10));
    const [ch, cm] = openingHours.close_at.split(":").map((n) => parseInt(n, 10));
    const start = new Date(day);
    start.setHours(oh, om, 0, 0);
    const end = new Date(day);
    end.setHours(ch, cm, 0, 0);
    return { start, end };
  }, [day, openingHours]);

  const pxPerMin = 2;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [creating, setCreating] = useState<null | { staffId: string; start: number; end: number }>(null);
  const [dragging, setDragging] = useState<
    | null
    | {
      id: string;
      staffId: string;
      mode: "move" | "resize-top" | "resize-bottom";
      startMin: number;
      endMin: number;
      anchorMin?: number;
    }
  >(null);
  const [draggingRes, setDraggingRes] = useState<
    | null
    | {
      id: string;
      staffId: string;
      mode: "move" | "resize-top" | "resize-bottom";
      startMin: number;
      endMin: number;
      anchorMin?: number;
    }
  >(null);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [editingRes, setEditingRes] = useState<null | { id: string; staffId: string; notes: string }>(null);
  const editTimerRef = useRef<number | null>(null);
  const cancelLongPress = () => { };
  const [pendingBlock, setPendingBlock] = useState<null | { staffId: string; start: Date; end: Date }>(null);
  const [rememberChoice, setRememberChoice] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("admin:lastBlockTypeRemember") === "1";
    } catch { return false; }
  });
  const [lastBlockType, setLastBlockType] = useState<"task" | "break" | "walk_in" | null>(() => {
    try {
      const v = window.localStorage.getItem("admin:lastBlockType");
      if (v === "task" || v === "break" || v === "walk_in") return v;
      return null;
    } catch { return null; }
  });

  const minutesTotal = useMemo(() => {
    if (!range) return 0;
    return Math.max(0, Math.round((range.end.getTime() - range.start.getTime()) / 60000));
  }, [range]);

  const toMinutesFromTop = (when: Date) => {
    if (!range) return 0;
    return Math.round((when.getTime() - range.start.getTime()) / 60000);
  };

  const clampSnap = (m: number) => {
    const snapped = Math.round(m / snapMinutes) * snapMinutes;
    return Math.max(0, Math.min(minutesTotal, snapped));
  };

  const handlePointerDown = (e: React.PointerEvent, staffId: string) => {
    if (!range || !creationEnabled) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = clampSnap(Math.round(y / pxPerMin));
    setCreating({ staffId, start: minutes, end: minutes });
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!range) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = clampSnap(Math.round(y / pxPerMin));
    if (creating) {
      setCreating({ ...creating, end: minutes });
      return;
    }
    if (dragging) {
      if (dragging.mode === "move") {
        const dur = dragging.endMin - dragging.startMin;
        const nextStart = clampSnap(minutes - (dragging.anchorMin ?? 0));
        const nextEnd = clampSnap(nextStart + dur);
        setDragging({ ...dragging, startMin: nextStart, endMin: nextEnd });
      } else if (dragging.mode === "resize-top") {
        const nextStart = clampSnap(minutes);
        if (nextStart < dragging.endMin) setDragging({ ...dragging, startMin: nextStart });
      } else if (dragging.mode === "resize-bottom") {
        const nextEnd = clampSnap(minutes);
        if (nextEnd > dragging.startMin) setDragging({ ...dragging, endMin: nextEnd });
      }
    }
    if (draggingRes) {
      if (draggingRes.mode === "move") {
        const dur = draggingRes.endMin - draggingRes.startMin;
        const nextStart = clampSnap(minutes - (draggingRes.anchorMin ?? 0));
        const nextEnd = clampSnap(nextStart + dur);
        setDraggingRes({ ...draggingRes, startMin: nextStart, endMin: nextEnd });
      } else if (draggingRes.mode === "resize-top") {
        const nextStart = clampSnap(minutes);
        if (nextStart < draggingRes.endMin) setDraggingRes({ ...draggingRes, startMin: nextStart });
      } else if (draggingRes.mode === "resize-bottom") {
        const nextEnd = clampSnap(minutes);
        if (nextEnd > draggingRes.startMin) setDraggingRes({ ...draggingRes, endMin: nextEnd });
      }
    }
  };
  const handlePointerMoveGlobal = (e: React.PointerEvent) => {
    if (!range) return;
    const container = (e.currentTarget.closest('[data-timetable-col="true"]') as HTMLDivElement) || (e.currentTarget as HTMLDivElement);
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = clampSnap(Math.round(y / pxPerMin));
    if (creating) {
      setCreating({ ...creating, end: minutes });
      return;
    }
    if (dragging) {
      if (dragging.mode === "move") {
        const dur = dragging.endMin - dragging.startMin;
        const nextStart = clampSnap(minutes - (dragging.anchorMin ?? 0));
        const nextEnd = clampSnap(nextStart + dur);
        setDragging({ ...dragging, startMin: nextStart, endMin: nextEnd });
      } else if (dragging.mode === "resize-top") {
        const nextStart = clampSnap(minutes);
        if (nextStart < dragging.endMin) setDragging({ ...dragging, startMin: nextStart });
      } else if (dragging.mode === "resize-bottom") {
        const nextEnd = clampSnap(minutes);
        if (nextEnd > dragging.startMin) setDragging({ ...dragging, endMin: nextEnd });
      }
    }
    if (draggingRes) {
      if (draggingRes.mode === "move") {
        const dur = draggingRes.endMin - draggingRes.startMin;
        const nextStart = clampSnap(minutes - (draggingRes.anchorMin ?? 0));
        const nextEnd = clampSnap(nextStart + dur);
        setDraggingRes({ ...draggingRes, startMin: nextStart, endMin: nextEnd });
      } else if (draggingRes.mode === "resize-top") {
        const nextStart = clampSnap(minutes);
        if (nextStart < draggingRes.endMin) setDraggingRes({ ...draggingRes, startMin: nextStart });
      } else if (draggingRes.mode === "resize-bottom") {
        const nextEnd = clampSnap(minutes);
        if (nextEnd > draggingRes.startMin) setDraggingRes({ ...draggingRes, endMin: nextEnd });
      }
    }
  };
  const handlePointerUp = async () => {
    if (!creationEnabled || !creating || !range) return;
    const startMin = Math.min(creating.start, creating.end);
    const endMin = Math.max(creating.start, creating.end + snapMinutes);
    const start = new Date(range.start.getTime() + startMin * 60000);
    const end = new Date(range.start.getTime() + endMin * 60000);
    setCreating(null);
    if (lastBlockType) {
      const choice = lastBlockType;
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: creating.staffId, start_at: start.toISOString(), end_at: end.toISOString(), block_type: choice }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const note = choice === "break" ? "休憩" : choice === "walk_in" ? "飛び込み対応" : "業務";
      await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: creating.staffId, start_at: start.toISOString(), end_at: end.toISOString(), note }),
      }).then(() => {
        router.refresh();
      }, () => {
        window.alert("作成に失敗しました");
      });
      return;
    }
    setPendingBlock({ staffId: creating.staffId, start, end });
  };

  const commitDragging = async () => {
    if (!range) {
      setDragging(null);
      setDraggingRes(null);
      return;
    }
    if (dragging) {
      const start = new Date(range.start.getTime() + dragging.startMin * 60000);
      const end = new Date(range.start.getTime() + dragging.endMin * 60000);

      if (!window.confirm(`${formatTime(start)} - ${formatTime(end)} に変更しますか？`)) {
        setDragging(null);
        return;
      }

      await fetch(`/api/admin/shifts/${dragging.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: start.toISOString(), end_at: end.toISOString() }),
      }).then(() => {
        router.refresh();
      }, () => { });
      setDragging(null);
    }
    if (draggingRes) {
      const start = new Date(range.start.getTime() + draggingRes.startMin * 60000);
      const end = new Date(range.start.getTime() + draggingRes.endMin * 60000);

      if (!window.confirm(`${formatTime(start)} - ${formatTime(end)} に変更しますか？`)) {
        setDraggingRes(null);
        return;
      }

      const res = await fetch(`/api/admin/reservations/${draggingRes.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: start.toISOString(), end_at: end.toISOString() }),
      });
      try {
        const data = await res.json();
        if (res.ok && !data?.error) {
          setReservationsLocal((prev) => prev.map((r) => r.id === draggingRes.id ? { ...r, start_at: start.toISOString(), end_at: end.toISOString() } : r));
          router.refresh();
        } else if (res.status === 409) {
          window.alert("この時間帯は他の予約と重なっています。時間をずらしてください。");
          router.refresh(); // Revert UI
        } else {
          window.alert("予約の更新に失敗しました。");
          router.refresh(); // Revert UI
        }
      } catch { }
      setDraggingRes(null);
    }
  };

  // 現在時刻バーの更新
  const isToday = useMemo(() => {
    const now = new Date();
    return now.toDateString() === day.toDateString();
  }, [day]);
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => setNowTs(Date.now()), 60000);
    return () => clearInterval(t);
  }, [isToday]);

  const renderReservation = (
    r: Reservation,
    layout?: { leftPct: number; widthPct: number },
    overlap?: boolean,
  ) => {
    if (!range) return null;
    const s = new Date(r.start_at);
    const e = new Date(r.end_at);
    const topBase = toMinutesFromTop(s);
    const endBase = toMinutesFromTop(e);
    const top = ((draggingRes && draggingRes.id === r.id) ? draggingRes.startMin : topBase) * pxPerMin;
    const height = Math.max(pxPerMin, (((draggingRes && draggingRes.id === r.id) ? draggingRes.endMin : endBase) - ((draggingRes && draggingRes.id === r.id) ? draggingRes.startMin : topBase)) * pxPerMin);
    const staffId = r.staff_id || r.staff?.id || "";
    const isDragging = !!(draggingRes && draggingRes.id === r.id);
    return (
      <div
        key={`res-${r.id}`}
        className={`absolute rounded border text-xs ${overlap ? "ring-2 ring-red-500/70" : ""} ${isDragging ? "z-10 shadow-lg" : ""}`}
        style={{
          top,
          height,
          ...getStyle(r.status),
          transform: isDragging ? "scale(1.03)" : undefined,
          left: layout ? `${layout.leftPct}%` : 4,
          width: layout ? `${layout.widthPct}%` : undefined,
          right: layout ? undefined : 4,
          zIndex: isDragging ? 50 : 10,
        }}>
        <div className="px-2 py-1">
          <div className="font-semibold truncate">{r.service?.name ?? "予約"}</div>
          <div className="truncate">{formatTime(s)} - {formatTime(e)}{typeof r.service?.duration_min === "number" ? `（${r.service?.duration_min}分）` : ""}</div>
          {r.customer_name ? (<div className="truncate">{r.customer_name}</div>) : null}
          {r.notes ? (<div className="truncate text-[11px] text-slate-200/80">{r.notes}</div>) : null}
          {r.status === "confirmed" ? (
            <div className="mt-1 inline-block rounded bg-emerald-700/70 px-2 py-0.5 text-[10px] text-emerald-100">確定</div>
          ) : null}
        </div>
        <div
          className="absolute inset-0 cursor-grab"
          onPointerDown={(ev) => {
            ev.stopPropagation();
            (ev.currentTarget as any).setPointerCapture?.(ev.pointerId);
            const container = (ev.currentTarget.closest('[data-timetable-col="true"]') as HTMLDivElement) || (ev.currentTarget.parentElement?.parentElement as HTMLDivElement);
            const rect = container.getBoundingClientRect();
            const y = ev.clientY - rect.top;
            const anchor = clampSnap(Math.round(y / pxPerMin)) - toMinutesFromTop(s);
            setDraggingRes({ id: r.id, staffId: staffId || "", mode: "move", startMin: toMinutesFromTop(s), endMin: toMinutesFromTop(e), anchorMin: Math.max(0, anchor) });
          }}
          onDoubleClick={() => setEditingRes({ id: r.id, staffId: staffId || "", notes: r.notes ?? "" })}
          onPointerMove={handlePointerMoveGlobal}
          onPointerUp={(e) => { e.stopPropagation(); (e.currentTarget as any).releasePointerCapture?.(e.pointerId); commitDragging(); }}
          onPointerLeave={() => { }}
        />
        <div
          className="absolute left-2 right-2 h-2 -top-1 cursor-n-resize"
          onPointerDown={(ev) => {
            ev.stopPropagation();
            setDraggingRes({ id: r.id, staffId: staffId || "", mode: "resize-top", startMin: toMinutesFromTop(s), endMin: toMinutesFromTop(e) });
          }}
          onPointerUp={(ev) => { ev.stopPropagation(); commitDragging(); }}
          onPointerLeave={() => { }}
        />
        <div
          className="absolute left-2 right-2 h-2 -bottom-1 cursor-s-resize"
          onPointerDown={(ev) => {
            ev.stopPropagation();
            setDraggingRes({ id: r.id, staffId: staffId || "", mode: "resize-bottom", startMin: toMinutesFromTop(s), endMin: toMinutesFromTop(e) });
          }}
          onPointerUp={(ev) => { ev.stopPropagation(); commitDragging(); }}
          onPointerLeave={() => { }}
        />
      </div>
    );
  };

  const renderEditPanel = () => {
    if (!editingRes) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setEditingRes(null)} />
        <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-slate-100">
          <div className="mb-2 text-sm">予約編集</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-300">メモ</label>
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/70 px-2 py-1 text-sm text-slate-100"
                value={editingRes.notes}
                onChange={(e) => setEditingRes({ ...editingRes, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded border border-slate-700 px-3 py-1 text-sm"
              onClick={() => setEditingRes(null)}
            >キャンセル</button>
            <button
              className="rounded bg-emerald-700 px-3 py-1 text-sm"
              onClick={async () => {
                await fetch(`/api/admin/reservations/${editingRes.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ notes: editingRes.notes }),
                }).then(() => { }, () => { });
                setEditingRes(null);
              }}
            >保存</button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateBlockPanel = () => {
    if (!pendingBlock) return null;
    const s = pendingBlock.start;
    const e = pendingBlock.end;
    const createWith = async (choice: "task" | "break" | "walk_in") => {
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: pendingBlock.staffId, start_at: s.toISOString(), end_at: e.toISOString(), block_type: choice }),
      });
      if (res.ok) {
        if (rememberChoice) {
          try {
            window.localStorage.setItem("admin:lastBlockType", choice);
            window.localStorage.setItem("admin:lastBlockTypeRemember", "1");
            setLastBlockType(choice);
          } catch { }
        }
        setPendingBlock(null);
        router.refresh();
        return;
      }
      const note = choice === "break" ? "休憩" : choice === "walk_in" ? "飛び込み対応" : "業務";
      await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: pendingBlock.staffId, start_at: s.toISOString(), end_at: e.toISOString(), note }),
      }).then(() => {
        setPendingBlock(null);
        router.refresh();
      }, () => {
        window.alert("作成に失敗しました");
      });
    };
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setPendingBlock(null)} />
        <div className="relative z-10 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-slate-100">
          <div className="mb-2 text-sm">ブロック作成</div>
          <div className="text-xs text-slate-300 mb-3">{formatTime(s)} - {formatTime(e)}</div>
          <div className="text-[11px] text-slate-400 mb-2">※ 種類に迷ったら「休憩」を選んでください（あとで変更可能）。</div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => createWith("task")}>業務</Button>
            <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => createWith("break")}>休憩</Button>
            <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => createWith("walk_in")}>飛び込み対応</Button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={rememberChoice} onChange={(e) => {
              const v = e.target.checked;
              setRememberChoice(v);
              try { window.localStorage.setItem("admin:lastBlockTypeRemember", v ? "1" : "0"); } catch { }
            }} />
            次回からこの種類を自動選択
          </label>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" className="text-slate-300" onClick={() => setPendingBlock(null)}>キャンセル</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderBlock = (b: StaffBlock) => {
    if (!range) return null;
    const st = new Date(b.start_at);
    const en = new Date(b.end_at);
    const top = toMinutesFromTop(st) * pxPerMin;
    const height = Math.max(pxPerMin, (toMinutesFromTop(en) - toMinutesFromTop(st)) * pxPerMin);
    const colors = blockColors(b.block_type);
    return (
      <div
        key={`bl-${b.id}`}
        className="absolute left-1 right-1 rounded border text-[11px]"
        style={{ top, height, backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
      >
        <div className="px-2 py-1">
          <div className="font-medium truncate">{blockLabel(b.block_type)}</div>
          <div>{formatTime(st)} - {formatTime(en)}</div>
          {b.note ? (<div className="truncate text-[10px] opacity-80">{b.note}</div>) : null}
        </div>
        <div className="absolute top-1 right-2 rounded px-2 py-0.5 text-[10px]" style={{ backgroundColor: colors.border, color: colors.text }}>{blockLabel(b.block_type)}</div>
      </div>
    );
  };

  const renderShift = (s: Shift, muted?: boolean) => {
    if (!range) return null;
    const st = new Date(s.start_at);
    const en = new Date(s.end_at);
    const topBase = toMinutesFromTop(st);
    const endBase = toMinutesFromTop(en);
    const top = ((dragging && dragging.id === s.id) ? dragging.startMin : topBase) * pxPerMin;
    const height = Math.max(pxPerMin, (((dragging && dragging.id === s.id) ? dragging.endMin : endBase) - ((dragging && dragging.id === s.id) ? dragging.startMin : topBase)) * pxPerMin);
    const isBreak = (s.note ?? "").includes("休憩");
    const isDragging = !!(dragging && dragging.id === s.id);
    return (
      <div
        key={`sh-${s.id}`}
        className={`absolute left-1 right-1 rounded border text-xs ${isBreak ? "bg-slate-200/10 border-white/20 text-slate-100" : "bg-slate-200/10 border-white/20 text-slate-100"} ${isDragging ? "z-10 shadow-lg" : ""}`}
        style={{ top, height, transform: isDragging ? "scale(1.03)" : undefined }}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.currentTarget as any).setPointerCapture?.(e.pointerId);
          const container = (e.currentTarget.closest('[data-timetable-col="true"]') as HTMLDivElement) || (e.currentTarget.parentElement as HTMLDivElement);
          const rect = container.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const anchor = clampSnap(Math.round(y / pxPerMin)) - toMinutesFromTop(st);
          setDragging({ id: s.id, staffId: s.staff_id, mode: "move", startMin: toMinutesFromTop(st), endMin: toMinutesFromTop(en), anchorMin: Math.max(0, anchor) });
        }}
        onPointerUp={(e) => { e.stopPropagation(); (e.currentTarget as any).releasePointerCapture?.(e.pointerId); commitDragging(); }}
      >
        {muted ? null : (
          <div className="px-2 py-1">
            <div className="font-medium truncate">{s.staff?.name ?? ""}</div>
            <div>{formatTime(st)} - {formatTime(en)}</div>
          </div>
        )}
        {isBreak && !muted ? (
          <div className="absolute top-1 right-2 rounded px-2 py-0.5 text-[10px]" style={{ backgroundColor: "#64748B", color: "#e2e8f0" }}>休憩</div>
        ) : null}
        <div
          className="absolute left-2 right-2 h-2 -top-1 cursor-n-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            cancelLongPress();
            setDragging({ id: s.id, staffId: s.staff_id, mode: "resize-top", startMin: toMinutesFromTop(st), endMin: toMinutesFromTop(en) });
          }}
          onPointerUp={(e) => { e.stopPropagation(); commitDragging(); }}
        />
        <div
          className="absolute left-2 right-2 h-2 -bottom-1 cursor-s-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            cancelLongPress();
            setDragging({ id: s.id, staffId: s.staff_id, mode: "resize-bottom", startMin: toMinutesFromTop(st), endMin: toMinutesFromTop(en) });
          }}
          onPointerUp={(e) => { e.stopPropagation(); commitDragging(); }}
        />
      </div>
    );
  };

  if (!range || !openingHours?.is_open) {
    return <div className="py-6 text-center text-slate-400">休業日です</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowShifts((v) => !v)}>{showShifts ? "シフトを隠す" : "シフトを表示"}</Button>
        <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowBlocks((v) => !v)}>{showBlocks ? "ブロックを隠す" : "ブロックを表示"}</Button>
        <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setResolveOverlap((v) => !v)}>{resolveOverlap ? "重なり解消：オン" : "重なり解消：オフ"}</Button>
        <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setCreationEnabled((v) => !v)}>{creationEnabled ? "作成モード：オン" : "作成モード：オフ"}</Button>
      </div>
      <div className="flex gap-4">
        {staff.map((st) => {
          const resForStaff = reservations.filter((r) => (r.staff_id ?? r.staff?.id ?? "") === st.id);
          const shiftsForStaff = shifts.filter((s) => s.staff_id === st.id);
          const blocksForStaff = blocks.filter((b) => b.staff_id === st.id);
          const toMin = (r: Reservation) => {
            const s = new Date(r.start_at);
            const e = new Date(r.end_at);
            const startMin = (draggingRes && draggingRes.id === r.id) ? draggingRes.startMin : toMinutesFromTop(s);
            const endMin = (draggingRes && draggingRes.id === r.id) ? draggingRes.endMin : toMinutesFromTop(e);
            return { startMin, endMin };
          };
          const laneInfo = (() => {
            if (!resolveOverlap) return new Map<string, { lane: number; lanes: number }>();
            const items = resForStaff.map((r) => ({ id: r.id, ...toMin(r) })).sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
            const lanesEnd: number[] = [];
            const assignments = new Map<string, { lane: number; lanes: number }>();
            for (const it of items) {
              let laneIdx = lanesEnd.findIndex((end) => end <= it.startMin);
              if (laneIdx === -1) {
                lanesEnd.push(it.endMin);
                laneIdx = lanesEnd.length - 1;
              } else {
                lanesEnd[laneIdx] = it.endMin;
              }
              assignments.set(it.id, { lane: laneIdx, lanes: lanesEnd.length });
            }
            return assignments;
          })();
          return (
            <div key={st.id} className="flex-1">
              <div className="text-center text-sm text-slate-300 mb-2">{st.display_name}</div>
              <div
                ref={containerRef}
                className="relative border border-slate-800 rounded bg-slate-950/60 touch-none select-none"
                data-timetable-col="true"
                style={{ height: minutesTotal * pxPerMin }}
                onPointerDown={(e) => handlePointerDown(e, st.id)}
                onPointerMove={handlePointerMoveGlobal}
                onPointerUp={(e) => { commitDragging(); handlePointerUp(); }}
                onPointerLeave={() => { commitDragging(); }}
              >
                {/* 枠（スロット間隔）グリッド線 */}
                {Array.from({ length: Math.floor(minutesTotal / snapMinutes) + 1 }).map((_, i) => (
                  <div key={`minor-${i}`} className="absolute left-0 right-0 border-t border-dashed border-slate-700/10" style={{ top: i * snapMinutes * pxPerMin }} />
                ))}
                {Array.from({ length: Math.ceil(minutesTotal / 60) + 1 }).map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-slate-600/20" style={{ top: i * 60 * pxPerMin }}>
                    <div className="absolute -left-2 -top-2 text-[10px] text-slate-400">{formatHour(addMinutes(range.start, i * 60))}</div>
                  </div>
                ))}
                {showBlocks ? blocksForStaff.map((b) => renderBlock(b)) : null}
                {showShifts ? shiftsForStaff.map((s) => {
                  const ss = new Date(s.start_at).getTime();
                  const se = new Date(s.end_at).getTime();
                  const overlappedWithBlock = blocksForStaff.some((b) => {
                    const bs = new Date(b.start_at).getTime();
                    const be = new Date(b.end_at).getTime();
                    return ss < be && se > bs;
                  });
                  return renderShift(s, overlappedWithBlock);
                }) : null}
                {(reservationsLocal.filter((r) => (r.staff_id ?? r.staff?.id ?? "") === st.id)).map((r) => {
                  const rs = new Date(r.start_at);
                  const re = new Date(r.end_at);
                  const overlap = shiftsForStaff.some((s) => {
                    const ss = new Date(s.start_at).getTime();
                    const se = new Date(s.end_at).getTime();
                    const rsMs = rs.getTime();
                    const reMs = re.getTime();
                    return ss < reMs && se > rsMs;
                  });
                  const info = laneInfo.get(r.id);
                  if (!info || info.lanes <= 1) return renderReservation(r, undefined, overlap);
                  const widthPct = 100 / info.lanes;
                  const leftPct = info.lane * widthPct;
                  return renderReservation(r, { leftPct, widthPct }, overlap);
                })}
                {/* 現在時刻バー（当日） */}
                {isToday ? (() => {
                  const now = new Date(nowTs);
                  if (now < range.start || now > range.end) return null;
                  const top = toMinutesFromTop(now) * pxPerMin;
                  return (
                    <div className="absolute left-0 right-0 pointer-events-none" style={{ top }}>
                      <div className="h-0.5 bg-red-500" />
                      <div className="absolute -top-2 left-0 text-[10px] rounded bg-red-600/80 px-1 py-0.5 text-white">{formatTime(now)}</div>
                    </div>
                  );
                })() : null}
                {creating && creating.staffId === st.id ? (
                  <div
                    className="absolute left-1 right-1 rounded bg-emerald-800/40 border border-emerald-600"
                    style={{
                      top: Math.min(creating.start, creating.end) * pxPerMin,
                      height: Math.max(snapMinutes, Math.abs(creating.end - creating.start)) * pxPerMin,
                    }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {renderEditPanel()}
      {renderCreateBlockPanel()}
    </div>
  );
}

function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000);
}
function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
function formatHour(d: Date) {
  return `${pad(d.getHours())}:00`;
}
function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// Pattern helper
function getPattern(color: string) {
  return `repeating-linear-gradient(45deg, ${color}, ${color} 10px, ${color}cc 10px, ${color}cc 20px)`;
}

function toBg(status: string) {
  if (status === "canceled") return "#334155"; // Slate 700 (solid)
  if (status === "pending") return "#9333ea"; // Purple 600
  if (status === "completed") return "#475569"; // Slate 600
  if (status === "confirmed") return "#059669"; // Emerald 600
  return "#2563eb"; // Blue 600
}
function toBorder(status: string) {
  if (status === "canceled") return "#1e293b";
  if (status === "pending") return "#7e22ce";
  if (status === "completed") return "#334155";
  if (status === "confirmed") return "#047857";
  return "#1d4ed8";
}
function toText(status: string) {
  return "#ffffff";
}

// Custom style helper for the div
function getStyle(status: string) {
  const bg = toBg(status);
  const border = toBorder(status);

  if (status === "pending") {
    // Striped for pending
    return {
      backgroundImage: `repeating-linear-gradient(45deg, ${bg}99, ${bg}99 10px, ${border}99 10px, ${border}99 20px)`,
      borderColor: border,
      color: "#fff",
      borderWidth: "2px",
    }
  }
  if (status === "canceled") {
    return { backgroundColor: "#334155", opacity: 0.6, borderColor: border, color: "#cbd5e1" };
  }
  return { backgroundColor: bg, borderColor: border, color: "#fff" };
}

export { };

function blockColors(t: "task" | "break" | "walk_in") {
  if (t === "break") return { bg: "#64748B80", border: "#64748B", text: "#e2e8f0" };
  if (t === "walk_in") return { bg: "#9333EA80", border: "#9333EA", text: "#ede9fe" };
  return { bg: "#F59E0B80", border: "#F59E0B", text: "#fff7ed" };
}

function blockLabel(t: "task" | "break" | "walk_in") {
  if (t === "break") return "休憩";
  if (t === "walk_in") return "飛び込み対応";
  return "業務";
}
