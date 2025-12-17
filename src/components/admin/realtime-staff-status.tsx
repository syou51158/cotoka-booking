"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type StaffStatus = {
    id: string;
    display_name: string;
    color: string | null;
    attendance: {
        status: "working" | "break" | "clocked_out" | null;
        clock_in_at: string | null;
        last_break_start_at: string | null;
    } | null;
};

export function RealtimeStaffStatus({ initialData }: { initialData?: StaffStatus[] }) {
    const [staffStatuses, setStaffStatuses] = useState<StaffStatus[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);

    useEffect(() => {
        if (initialData) {
            setLoading(false);
            return;
        }

        const fetchStatuses = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: staff } = await supabase
                .from("staff")
                .select("id, display_name, color")
                .eq("active", true);

            if (!staff) return;

            const today = new Date().toISOString().split('T')[0];
            const { data: attendance } = await supabase
                .from("attendance_records")
                .select("*")
                .eq("date", today);

            const statuses = staff.map(s => {
                const record = attendance?.find(a => a.staff_id === s.id);
                return {
                    ...s,
                    attendance: record ? {
                        status: record.status,
                        clock_in_at: record.clock_in_at,
                        last_break_start_at: record.last_break_start_at
                    } : null
                };
            });

            setStaffStatuses(statuses);
            setLoading(false);
        };

        fetchStatuses();
    }, []);

    if (loading) return <div className="text-sm text-slate-400">読み込み中...</div>;

    return (
        <div className="space-y-4">
            {/* Status Badge Counter - moving it inside list? No, parent has title. 
                 Let's put the counter at the top right of the parent? 
                 Actually, just showing the list is fine for now, or a minimal sub-header.
             */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-xs text-slate-400">現在</span>
                <Badge variant="outline" className="font-normal text-xs border-white/10 text-slate-300">
                    {staffStatuses.filter(s => s.attendance?.status === 'working').length} Working
                </Badge>
            </div>

            {staffStatuses.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-9 w-9 border-0 ring-2 ring-white/10 shadow-sm">
                            <AvatarFallback
                                className="text-xs text-white font-medium"
                                style={{ backgroundColor: staff.color || '#94a3b8' }}
                            >
                                {staff.display_name.slice(0, 1)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none text-white">{staff.display_name}</span>
                            <span className="text-[10px] text-slate-400 mt-1">
                                {staff.attendance?.clock_in_at
                                    ? `${new Date(staff.attendance.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IN`
                                    : "未出勤"}
                            </span>
                        </div>
                    </div>
                    <Badge
                        variant="secondary"
                        className={
                            staff.attendance?.status === "working" ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" :
                                staff.attendance?.status === "break" ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" :
                                    "bg-white/5 text-slate-400 border border-white/5"
                        }
                    >
                        {staff.attendance?.status === "working"
                            ? "勤務中"
                            : staff.attendance?.status === "break"
                                ? "休憩中"
                                : staff.attendance?.status === "clocked_out"
                                    ? "退勤"
                                    : "OFF"}
                    </Badge>
                </div>
            ))}
            {staffStatuses.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">スタッフがいません</p>
            )}
        </div>
    );
}
