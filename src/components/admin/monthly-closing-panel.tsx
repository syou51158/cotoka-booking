"use client";

import { useState } from "react";
import { getMonthlySummary, closeMonth, MonthlyStats } from "@/app/admin/(protected)/sales/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Download, Lock } from "lucide-react";
import { toast } from "@/lib/toast";

export function MonthlyClosingPanel() {
    const [month, setMonth] = useState<string>(format(new Date(), "yyyy-MM"));
    const [stats, setStats] = useState<MonthlyStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await getMonthlySummary(month);
            setStats(data);
        } catch (error: any) {
            toast.error(error.message, "エラー");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async () => {
        if (!confirm(`${month}の締め処理を行いますか？ 承認済みの日報がロックされます。`)) return;
        setClosing(true);
        try {
            await closeMonth(month);
            toast.success("月次締め処理が完了しました", "完了");
            loadStats(); // Reload
        } catch (error: any) {
            toast.error(error.message, "エラー");
        } finally {
            setClosing(false);
        }
    };
    
    const handleDownloadCSV = () => {
        if (!stats) return;
        const headers = ["スタッフID", "名前", "総売上", "件数"];
        const rows = stats.staffStats.map(s => [s.staff_id, s.staff_name, s.total_sales, s.entry_count]);
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>月次締め処理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">対象月</label>
                        <input 
                            type="month" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        />
                    </div>
                    <Button onClick={loadStats} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "レポート読込"}
                    </Button>
                </div>

                {stats && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <div className="text-sm text-muted-foreground">総売上</div>
                                <div className="text-2xl font-bold">¥{stats.totalSales.toLocaleString()}</div>
                            </div>
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <div className="text-sm text-muted-foreground">承認済み売上</div>
                                <div className="text-2xl font-bold text-green-600">¥{stats.approvedSales.toLocaleString()}</div>
                            </div>
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <div className="text-sm text-muted-foreground">承認待ち件数</div>
                                <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleDownloadCSV}>
                                <Download className="mr-2 h-4 w-4" /> CSV出力
                            </Button>
                            <Button variant="destructive" onClick={handleClose} disabled={closing || stats.pendingCount > 0}>
                                {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                                今月を締める（確定）
                            </Button>
                        </div>
                        {stats.pendingCount > 0 && (
                            <p className="text-sm text-red-500">
                                You must approve or reject all pending entries before closing the month.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
