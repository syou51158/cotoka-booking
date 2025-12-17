"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO, parse } from "date-fns";
import { ja } from "date-fns/locale";
import AdminTimetable from "@/components/admin/timetable";

type Staff = {
  id: string;
  name: string;
  email: string;
};

type Shift = {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  note: string | null;
  staff?: Staff;
};

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [openingHours, setOpeningHours] = useState<Array<{ weekday: number; open_at: string; close_at: string; is_open: boolean }>>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [formData, setFormData] = useState({
    staff_id: "",
    date: "",
    start_time: "",
    end_time: "",
    note: "",
  });

  useEffect(() => {
    fetchData();
  }, [currentWeek, selectedStaff]);

  useEffect(() => {
    fetchOpeningHours();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const staffRes = await fetch("/api/admin/staff");
      const staffData = await staffRes.json();
      if (staffData?.error) throw new Error(staffData.error);
      setStaff(staffData);
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const staffParam = selectedStaff && selectedStaff !== "all" && selectedStaff !== "" ? `&staffId=${selectedStaff}` : "";
      const shiftsRes = await fetch(
        `/api/admin/shifts?week=${format(weekStart, "yyyy-MM-dd")}${staffParam}`
      );
      const shiftsData = await shiftsRes.json();
      if (shiftsData?.error) throw new Error(shiftsData.error);
      setShifts(shiftsData);
    } catch (error: any) {
      toast.error("データの取得に失敗しました: " + (error?.message || "不明なエラー"));
    } finally {
      setLoading(false);
    }
  };

  const fetchOpeningHours = async () => {
    try {
      const res = await fetch("/api/admin/schedule/opening-hours");
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setOpeningHours(data || []);
    } catch (error: any) {
      toast.error("営業時間の取得に失敗しました: " + (error?.message || "不明なエラー"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staff_id || !formData.date || !formData.start_time || !formData.end_time) {
      toast.error("必要な項目を入力してください");
      return;
    }
    try {
      const startLocal = new Date(`${formData.date}T${formData.start_time}:00`);
      const endLocal = new Date(`${formData.date}T${formData.end_time}:00`);

      if (endLocal <= startLocal) {
        toast.error("終了時刻は開始時刻より後に設定してください");
        return;
      }

      const startAt = startLocal.toISOString();
      const endAt = endLocal.toISOString();
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: formData.staff_id,
          start_at: startAt,
          end_at: endAt,
          note: formData.note,
        }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      await fetchData();
      setShowForm(false);
      setFormData({ staff_id: "", date: "", start_time: "", end_time: "", note: "" });
      toast.success("シフトを追加しました");
    } catch (error: any) {
      toast.error("追加に失敗しました: " + (error?.message || "不明なエラー"));
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/shifts/${shiftId}`, { method: "DELETE" });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setShifts(shifts.filter((s) => s.id !== shiftId));
      toast.success("削除しました");
    } catch (error: any) {
      toast.error("削除に失敗しました: " + (error?.message || "不明なエラー"));
    }
  };

  const changeWeek = (direction: number) => {
    setCurrentWeek(addDays(currentWeek, direction * 7));
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getShiftsForDay = (date: Date) => {
    return shifts.filter((shift) => isSameDay(parseTimestamp(shift.start_at), date));
  };

  const handleCreateShiftOnGrid = async (payload: { staff_id: string; start_at: Date; end_at: Date }) => {
    try {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: payload.staff_id,
          start_at: payload.start_at.toISOString(),
          end_at: payload.end_at.toISOString(),
          note: "",
        }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      await fetchData();
      toast.success("シフトを追加しました");
    } catch (error: any) {
      toast.error("追加に失敗しました: " + (error?.message || "不明なエラー"));
    }
  };

  if (loading) {
    return (
      <div className="py-8 px-4">
        <div className="text-center text-slate-200">読み込み中...</div>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const openingForSelectedDay = (() => {
    try {
      const d = weekDays[selectedDayIndex];
      const weekday = ((d.getDay() + 6) % 7);
      const row = openingHours.find((h) => h.weekday === weekday);
      return row ? { open_at: row.open_at, close_at: row.close_at, is_open: row.is_open } : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white drop-shadow-md">シフト管理</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          シフト追加
        </Button>
      </div>

      {/* 週選択とフィルター */}
      <Card className="border-slate-800 bg-slate-900/40">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => changeWeek(-1)} className="border-slate-700 text-slate-900 bg-white hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center flex-1">
              <div className="font-medium text-slate-200">
                {format(weekDays[0], "yyyy年MM月dd日", { locale: ja })} 〜 {format(weekDays[6], "MM月dd日", { locale: ja })}
              </div>
              <div className="text-sm text-slate-400">
                {format(weekDays[0], "第w週", { locale: ja })}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => changeWeek(1)} className="border-slate-700 text-slate-900 bg-white hover:bg-slate-100">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-4">
            <Label htmlFor="staff-filter" className="text-slate-300">スタッフで絞り込み</Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger id="staff-filter" className="bg-slate-900/80 text-slate-100">
                <SelectValue placeholder="すべてのスタッフ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのスタッフ</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 週間カレンダー */}
      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-slate-200">週間スケジュール</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border border-slate-800 rounded-lg p-3 bg-slate-950/60">
                <div className="text-center mb-3">
                  <div className="text-sm text-slate-400">
                    {format(day, "E", { locale: ja })}
                  </div>
                  <div className="font-medium text-slate-200">
                    {format(day, "d", { locale: ja })}
                  </div>
                </div>

                <div className="space-y-2">
                  {getShiftsForDay(day).map((shift) => (
                    <div
                      key={shift.id}
                      className="bg-blue-900/30 border border-blue-700 rounded p-2 text-xs text-blue-200"
                    >
                      <div className="font-medium">{shift.staff?.name}</div>
                      <div className="text-blue-200">
                        {format(parseTimestamp(shift.start_at), "HH:mm")} - {format(parseTimestamp(shift.end_at), "HH:mm")}
                      </div>
                      {shift.note && (
                        <div className="text-slate-300 mt-1">{shift.note}</div>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-blue-200 hover:text-blue-100" onClick={() => handleDelete(shift.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {getShiftsForDay(day).length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-2">
                      シフトなし
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* タイムテーブル（日次・スタッフ別カラム） */}
      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-slate-200">タイムテーブル（日次）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Label className="text-slate-300">表示日</Label>
            <Select value={String(selectedDayIndex)} onValueChange={(v) => setSelectedDayIndex(parseInt(v, 10))}>
              <SelectTrigger className="bg-slate-900/80 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {format(d, "M/d (E)", { locale: ja })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AdminTimetable
            day={weekDays[selectedDayIndex]}
            staff={(selectedStaff && selectedStaff !== "all" && selectedStaff !== "") ? staff.filter((s) => s.id === selectedStaff) : staff}
            shifts={getShiftsForDay(weekDays[selectedDayIndex])}
            openingHours={openingForSelectedDay}
            onCreate={handleCreateShiftOnGrid}
            onDelete={handleDelete}
            onUpdate={async ({ id, start_at, end_at }) => {
              try {
                const res = await fetch(`/api/admin/shifts/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    start_at: start_at ? start_at.toISOString() : undefined,
                    end_at: end_at ? end_at.toISOString() : undefined,
                  }),
                });
                const data = await res.json();
                if (data?.error) throw new Error(data.error);
                await fetchData();
                toast.success("シフトを更新しました");
              } catch (error: any) {
                toast.error("更新に失敗しました: " + (error?.message || "不明なエラー"));
              }
            }}
          />
        </CardContent>
      </Card>

      {/* シフト追加フォーム */}
      {showForm && (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-slate-200">シフト追加</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="staff" className="text-slate-300">スタッフ</Label>
                <Select value={formData.staff_id} onValueChange={(value) => setFormData({ ...formData, staff_id: value })}>
                  <SelectTrigger id="staff" className="bg-slate-900/80 text-slate-100">
                    <SelectValue placeholder="スタッフを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date" className="text-slate-300">日付</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="bg-slate-900/80 text-slate-100" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time" className="text-slate-300">開始時刻</Label>
                  <Input id="start_time" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required className="bg-slate-900/80 text-slate-100" />
                </div>
                <div>
                  <Label htmlFor="end_time" className="text-slate-300">終了時刻</Label>
                  <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required className="bg-slate-900/80 text-slate-100" />
                </div>
              </div>

              <div>
                <Label htmlFor="note" className="text-slate-300">備考</Label>
                <Input id="note" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="例：休憩あり、研修など" className="bg-slate-900/80 text-slate-100" />
              </div>

              <div className="flex gap-2">
                <Button type="submit">追加</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-slate-700 text-slate-200">キャンセル</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
const parseTimestamp = (s: string) => {
  const iso = (() => {
    try { return parseISO(s); } catch { return null as any; }
  })();
  if (iso && !isNaN(iso as any)) return iso as Date;
  const pg = parse(s, "yyyy-MM-dd HH:mm:ssXXX", new Date());
  return pg;
};


