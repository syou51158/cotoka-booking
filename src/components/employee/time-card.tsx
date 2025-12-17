"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Coffee, LogOut, Play, Square } from "lucide-react";

type AttendanceStatus = "working" | "break" | "clocked_out" | null;

export function TimeCard() {
  const [status, setStatus] = useState<AttendanceStatus>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const res = await fetch("/api/employee/attendance", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setRecord(data);
          setStatus(data.status);
        } else {
          setStatus(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const res = await fetch(`/api/attendance/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setRecord(data);
        setStatus(data.status);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border bg-card text-muted-foreground animate-pulse">
        読み込み中...
      </div>
    );
  }

  const isClockedOut = status === "clocked_out";

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {format(now, "yyyy年M月d日 (E)", { locale: ja })}
        </p>
        <h1 className="text-5xl font-mono font-bold tracking-tighter text-foreground">
          {format(now, "HH:mm")}
          <span className="text-2xl text-muted-foreground ml-1">{format(now, "ss")}</span>
        </h1>
        <div className="pt-2 flex justify-center">
          <Badge
            variant={status === "working" ? "default" : "outline"}
            className={`px-3 py-1 text-sm font-normal ${status === "working" ? "bg-emerald-600 hover:bg-emerald-700" :
                status === "break" ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent" :
                  status === "clocked_out" ? "bg-slate-200 text-slate-700 border-transparent" : ""
              }`}
          >
            {status === "working" ? "● WORK ON" :
              status === "break" ? "☕ BREAK" :
                status === "clocked_out" ? "FINISHED" : "OFF DUTY"}
          </Badge>
        </div>
      </div>

      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0 space-y-3">
          {!status && (
            <Button
              className="w-full h-32 rounded-2xl text-2xl font-bold shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 transition-all transform active:scale-95"
              onClick={() => handleAction("clock_in")}
              disabled={actionLoading}
            >
              <div className="flex flex-col items-center gap-2">
                <Play className="h-8 w-8 fill-current" />
                <span>CLOCK IN</span>
              </div>
            </Button>
          )}

          {status === "working" && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="h-32 rounded-2xl text-lg font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-200 border"
                onClick={() => handleAction("break_start")}
                disabled={actionLoading}
              >
                <div className="flex flex-col items-center gap-2">
                  <Coffee className="h-8 w-8" />
                  <span>BREAK</span>
                </div>
              </Button>
              <Button
                variant="destructive"
                className="h-32 rounded-2xl text-lg font-semibold bg-slate-800 hover:bg-slate-900 shadow-lg"
                onClick={() => handleAction("clock_out")}
                disabled={actionLoading}
              >
                <div className="flex flex-col items-center gap-2">
                  <Square className="h-8 w-8 fill-current" />
                  <span>FINISH</span>
                </div>
              </Button>
            </div>
          )}

          {status === "break" && (
            <Button
              className="w-full h-32 rounded-2xl text-2xl font-bold shadow-xl bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleAction("break_end")}
              disabled={actionLoading}
            >
              <div className="flex flex-col items-center gap-2">
                <Play className="h-8 w-8" />
                <span>RESUME WORK</span>
              </div>
            </Button>
          )}

          {isClockedOut && (
            <div className="rounded-2xl border bg-card/50 p-6 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">Good Job!</p>
                <p className="text-sm text-muted-foreground">本日の業務は完了しました</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm border-t pt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">START</span>
                  <span className="font-mono font-medium">{record?.clock_in_at ? format(new Date(record.clock_in_at), "HH:mm") : "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">BREAK</span>
                  <span className="font-mono font-medium">{record?.break_minutes ?? 0}m</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">END</span>
                  <span className="font-mono font-medium">{record?.clock_out_at ? format(new Date(record.clock_out_at), "HH:mm") : "-"}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
