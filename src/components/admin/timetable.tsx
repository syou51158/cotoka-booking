"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Staff = { id: string; name: string };
type Shift = {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  note?: string | null;
  staff?: { id: string; name: string };
};

type OpeningHours = { open_at: string; close_at: string; is_open: boolean } | null;

type Props = {
  day: Date;
  staff: Staff[];
  shifts: Shift[];
  openingHours: OpeningHours;
  snapMinutes?: number;
  onCreate: (payload: { staff_id: string; start_at: Date; end_at: Date }) => Promise<void> | void;
  onDelete?: (shiftId: string) => void;
  onUpdate?: (payload: { id: string; start_at?: Date; end_at?: Date }) => Promise<void> | void;
};

export default function AdminTimetable({
  day,
  staff,
  shifts,
  openingHours,
  snapMinutes = 15,
  onCreate,
  onDelete,
  onUpdate,
}: Props) {
  const range = useMemo(() => {
    if (!openingHours || !openingHours.is_open) return null;
    const [openH, openM] = openingHours.open_at.split(":").map((n) => parseInt(n, 10));
    const [closeH, closeM] = openingHours.close_at.split(":").map((n) => parseInt(n, 10));
    const start = new Date(day);
    start.setHours(openH, openM, 0, 0);
    const end = new Date(day);
    end.setHours(closeH, closeM, 0, 0);
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

  const handleGridPointerDown = (e: React.PointerEvent, staffId: string) => {
    if (!range) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = clampSnap(Math.round(y / pxPerMin));
    setCreating({ staffId, start: minutes, end: minutes });
  };

  const handleGridPointerMove = (e: React.PointerEvent) => {
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
  };

  const handleGridPointerUp = async () => {
    if (!creating || !range) return;
    const startMin = Math.min(creating.start, creating.end);
    const endMin = Math.max(creating.start, creating.end + snapMinutes);
    const start = new Date(range.start.getTime() + startMin * 60000);
    const end = new Date(range.start.getTime() + endMin * 60000);
    setCreating(null);
    await onCreate({ staff_id: creating.staffId, start_at: start, end_at: end });
  };

  const commitDragging = async () => {
    if (!dragging || !range || !onUpdate) {
      setDragging(null);
      return;
    }
    const start = new Date(range.start.getTime() + dragging.startMin * 60000);
    const end = new Date(range.start.getTime() + dragging.endMin * 60000);
    await onUpdate({ id: dragging.id, start_at: start, end_at: end });
    setDragging(null);
  };

  const renderShiftBlock = (s: Shift) => {
    if (!range) return null;
    const start = new Date(s.start_at);
    const end = new Date(s.end_at);
    const topBase = toMinutesFromTop(start);
    const endBase = toMinutesFromTop(end);
    const top = ((dragging && dragging.id === s.id) ? dragging.startMin : topBase) * pxPerMin;
    const height = Math.max(pxPerMin, (((dragging && dragging.id === s.id) ? dragging.endMin : endBase) - ((dragging && dragging.id === s.id) ? dragging.startMin : topBase)) * pxPerMin);
    return (
      <div
        key={s.id}
        className="absolute left-1 right-1 rounded bg-blue-900/40 border border-blue-700 text-xs text-blue-100"
        style={{ top, height }}
        onPointerDown={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const anchor = clampSnap(Math.round(y / pxPerMin)) - toMinutesFromTop(start);
          setDragging({ id: s.id, staffId: s.staff_id, mode: "move", startMin: toMinutesFromTop(start), endMin: toMinutesFromTop(end), anchorMin: Math.max(0, anchor) });
        }}
        onPointerUp={commitDragging}
      >
        <div className="px-2 py-1">
          <div className="font-medium">{s.staff?.name}</div>
          <div>
            {formatTime(start)} - {formatTime(end)}
          </div>
          {s.note ? <div className="mt-1 text-slate-300">{s.note}</div> : null}
        </div>
        {onDelete ? (
          <div className="absolute bottom-1 right-1">
            <Button variant="outline" size="sm" className="h-6 px-2" onClick={() => onDelete(s.id)}>削除</Button>
          </div>
        ) : null}
        <div
          className="absolute left-2 right-2 h-2 -top-1 cursor-n-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            setDragging({ id: s.id, staffId: s.staff_id, mode: "resize-top", startMin: toMinutesFromTop(start), endMin: toMinutesFromTop(end) });
          }}
          onPointerUp={commitDragging}
        />
        <div
          className="absolute left-2 right-2 h-2 -bottom-1 cursor-s-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            setDragging({ id: s.id, staffId: s.staff_id, mode: "resize-bottom", startMin: toMinutesFromTop(start), endMin: toMinutesFromTop(end) });
          }}
          onPointerUp={commitDragging}
        />
      </div>
    );
  };

  if (!range || !openingHours?.is_open) {
    return (
      <div className="py-6 text-center text-slate-400">休業日です</div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-4">
        {staff.map((st) => {
          const dayShifts = shifts.filter((s) => s.staff_id === st.id);
          return (
            <div key={st.id} className="flex-1">
              <div className="text-center text-sm text-slate-300 mb-2">{st.name}</div>
              <div
                ref={containerRef}
                className="relative border border-slate-800 rounded bg-slate-950/60 touch-none select-none"
                style={{ height: minutesTotal * pxPerMin }}
                onPointerDown={(e) => handleGridPointerDown(e, st.id)}
                onPointerMove={handleGridPointerMove}
                onPointerUp={handleGridPointerUp}
              >
                {Array.from({ length: Math.ceil(minutesTotal / 60) + 1 }).map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-slate-600/20" style={{ top: i * 60 * pxPerMin }}>
                    <div className="absolute -left-2 -top-2 text-[10px] text-slate-500">{formatHour(addMinutes(range.start, i * 60))}</div>
                  </div>
                ))}
                {dayShifts.map((s) => renderShiftBlock(s))}
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
