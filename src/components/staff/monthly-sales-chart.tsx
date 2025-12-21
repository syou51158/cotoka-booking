"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";
import { Loader2, TrendingUp } from "lucide-react";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function MonthlySalesChart({ user }: { user: any }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date());

    useEffect(() => {
        fetchMonthlyData();
    }, [month, user.id]);

    const fetchMonthlyData = async () => {
        setLoading(true);
        try {
            const start = startOfMonth(month);
            const end = endOfMonth(month);

            const from = format(start, 'yyyy-MM-dd');
            const to = format(end, 'yyyy-MM-dd');

            const res = await fetch(`/api/staff/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
            const json: unknown = await res.json().catch(() => null);
            if (!res.ok) {
                const err = isRecord(json) && typeof json.error === "string" ? json.error : null;
                throw new Error(err || "月次データの取得に失敗しました");
            }

            const rows = (isRecord(json) && Array.isArray(json.entries) ? json.entries : []) as Array<{ date: string; sales_amount: number; status: string }>;
            const byDate = new Map(rows.map(r => [r.date, r]));

            // Fill in missing days
            const days = eachDayOfInterval({ start, end });
            const chartData = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const entry = byDate.get(dateStr);
                return {
                    date: format(day, 'd'), // Day number
                    fullDate: dateStr,
                    amount: entry ? entry.sales_amount : 0,
                    status: entry ? entry.status : 'none',
                    isToday: isToday(day)
                };
            });

            setData(chartData);

        } catch (error) {
            console.error("Error fetching chart:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalSales = data.reduce((sum, d) => sum + d.amount, 0);
    const reportedDays = data.filter(d => d.amount > 0).length;

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <CardHeader>
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                         <CardTitle className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            月次売上推移
                        </CardTitle>
                        <span className="text-sm font-medium text-muted-foreground">{format(month, 'yyyy年M月')}</span>
                    </div>
                    <div className="flex items-end justify-between">
                         <div className="flex flex-col">
                            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                                ¥{totalSales.toLocaleString()}
                            </span>
                         </div>
                         <div className="text-sm text-muted-foreground">
                            稼働日数: <span className="font-bold text-foreground">{reportedDays}</span>日
                         </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin h-8 w-8 text-emerald-500/50" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.3}/>
                                    </linearGradient>
                                     <linearGradient id="todayGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.5}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{fontSize: 10, fill: '#64748b'}} 
                                    axisLine={false}
                                    tickLine={false}
                                    interval={2}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                    formatter={(value: any) => [`¥${Number(value).toLocaleString()}`, '売上']}
                                    labelFormatter={(label) => `${format(month, 'yyyy年M月')}${label}日`}
                                />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.isToday ? "url(#todayGradient)" : "url(#barGradient)"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
