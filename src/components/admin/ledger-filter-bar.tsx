"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

type Staff = { id: string; display_name: string };

export function LedgerFilterBar({ staffList, currentDate }: { staffList: Staff[], currentDate: Date }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentStaff = searchParams.get("staff") || "all";
    const currentStatus = searchParams.get("status") || "all";

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`?${params.toString()}`);
    };

    const handleDayChange = (dateStr: string) => {
        if (!dateStr) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("day", dateStr);
        router.push(`?${params.toString()}`);
    };

    const prevDay = () => handleDayChange(format(addDays(currentDate, -1), "yyyy-MM-dd"));
    const nextDay = () => handleDayChange(format(addDays(currentDate, 1), "yyyy-MM-dd"));
    const today = () => handleDayChange(format(new Date(), "yyyy-MM-dd"));

    return (
        <div className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex-row md:items-center md:justify-between">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevDay}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                    <input
                        type="date"
                        className="h-9 w-[130px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={format(currentDate, "yyyy-MM-dd")}
                        onChange={(e) => handleDayChange(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="icon" onClick={nextDay}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={today}>今日</Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />

                <Select value={currentStaff} onValueChange={(val) => updateParam("staff", val)}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                        <SelectValue placeholder="スタッフ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全スタッフ</SelectItem>
                        {staffList.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={currentStatus} onValueChange={(val) => updateParam("status", val)}>
                    <SelectTrigger className="w-[110px] h-9 text-xs">
                        <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="confirmed">確定</SelectItem>
                        <SelectItem value="pending">未決済</SelectItem>
                        <SelectItem value="completed">完了</SelectItem>
                        <SelectItem value="canceled">キャンセル</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
