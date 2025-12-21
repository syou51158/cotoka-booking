"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Coffee, LogOut, Play, Square, Briefcase, CheckCircle2 } from "lucide-react";

type AttendanceStatus = "working" | "break" | "clocked_out" | null;

export function TimeCard({ staffId }: { staffId?: string }) {
  const [status, setStatus] = useState<AttendanceStatus>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [role, setRole] = useState<string>("employee");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [staffId]);

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

      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
      };
      if (staffId) {
        headers['x-staff-id'] = staffId;
      }

      const res = await fetch("/api/employee/attendance", {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setRecord(data);
          setStatus(data.status);
        } else {
          setStatus(null);
        }
        if (data.role) {
            setRole(data.role);
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

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };
      if (staffId) {
        headers['x-staff-id'] = staffId;
      }

      const res = await fetch(`/api/attendance/${action}`, {
        method: "POST",
        headers,
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

  const isContractor = role === 'contractor';
  const isClockedOut = status === "clocked_out";

  // Contractor-specific UI text and styles
  const startLabel = isContractor ? "業務開始" : "出勤";
  const endLabel = isContractor ? "業務終了" : "退勤";
  const workingLabel = isContractor ? "● 稼働中" : "● 勤務中";
  const endedLabel = isContractor ? "終了" : "勤務終了";
  
  const startColor = isContractor 
    ? "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" 
    : "bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800";
    
  const workingBadgeColor = isContractor 
    ? "bg-cyan-600 hover:bg-cyan-700" 
    : "bg-emerald-600 hover:bg-emerald-700";

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
        <div className="pt-2 flex justify-center flex-col items-center gap-2">
          <Badge
            variant={status === "working" ? "default" : "outline"}
            className={`px-3 py-1 text-sm font-normal ${status === "working" ? workingBadgeColor :
                status === "break" ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent" :
                  status === "clocked_out" ? "bg-slate-200 text-slate-700 border-transparent" : ""
              }`}
          >
            {status === "working" ? workingLabel :
              status === "break" ? "☕ 休憩中" :
                status === "clocked_out" ? endedLabel : "勤務外"}
          </Badge>
          {isContractor && (
             <span className="text-[10px] text-slate-400">※稼働状況の記録</span>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0 space-y-3">
          {!status && (
            <Button
              className={`w-full h-32 rounded-2xl text-2xl font-bold shadow-xl transition-all transform active:scale-95 ${startColor}`}
              onClick={() => handleAction("clock_in")}
              disabled={actionLoading}
            >
              <div className="flex flex-col items-center gap-2">
                {isContractor ? <Briefcase className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
                <span>{startLabel}</span>
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
                  <span>休憩</span>
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
                  <span>{endLabel}</span>
                </div>
              </Button>
            </div>
          )}

          {status === "break" && (
            <Button
              className={`w-full h-32 rounded-2xl text-2xl font-bold shadow-xl ${isContractor ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              onClick={() => handleAction("break_end")}
              disabled={actionLoading}
            >
              <div className="flex flex-col items-center gap-2">
                <Play className="h-8 w-8" />
                <span>再開</span>
              </div>
            </Button>
          )}

          {isClockedOut && (
            <div className="rounded-2xl border bg-card/50 p-6 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">お疲れ様でした！</p>
                <p className="text-sm text-muted-foreground">
                    {isContractor ? "本日の業務記録を保存しました" : "本日の業務は完了しました"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm border-t pt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">開始</span>
                  <span className="font-mono font-medium">{record?.clock_in_at ? format(new Date(record.clock_in_at), "HH:mm") : "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">休憩</span>
                  <span className="font-mono font-medium">{record?.break_minutes ?? 0}分</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">終了</span>
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
