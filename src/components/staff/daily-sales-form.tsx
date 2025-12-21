"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2, Plus, Trash2, CalendarIcon, Banknote, User, FileText, Send, AlertCircle, History, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SalesEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid_locked';

interface SalesEntry {
    id: string;
    date: string;
    sales_amount: number;
    status: SalesEntryStatus;
    note: string | null;
}

interface SalesTransaction {
    id: string;
    date: string;
    service_name: string;
    amount: number;
    customer_gender: string | null;
    notes: string | null;
    created_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function DailySalesForm({ user, staffId }: { user: any; staffId?: string }) {
    const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    
    // Daily Report Status
    const [entry, setEntry] = useState<SalesEntry | null>(null);
    const [recentEntries, setRecentEntries] = useState<SalesEntry[]>([]);
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
    
    // Transactions
    const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    
    // Form State
    const [serviceName, setServiceName] = useState("");
    const [amount, setAmount] = useState("");
    const [gender, setGender] = useState<string>("female");
    const [notes, setNotes] = useState("");
    
    // Loading States
    const [submitting, setSubmitting] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchData();
    }, [date, user.id, staffId]);

    const getHeaders = () => {
        const headers: Record<string, string> = {};
        if (staffId) {
            headers['x-staff-id'] = staffId;
        }
        return headers;
    };

    const fetchData = async () => {
        setFetching(true);
        try {
            const headers = getHeaders();
            
            // 1. Fetch Daily Report Status
            const resEntry = await fetch(`/api/staff/sales?date=${encodeURIComponent(date)}&recentLimit=5`, { headers });
            const jsonEntry = await resEntry.json().catch(() => null);
            
            if (resEntry.ok && isRecord(jsonEntry)) {
                setEntry(jsonEntry.entry as SalesEntry | null);
                setRecentEntries((jsonEntry.recentEntries as SalesEntry[]) || []);
            }

            // 2. Fetch Detailed Transactions
            setLoadingTransactions(true);
            const resTrans = await fetch(`/api/staff/transactions?date=${encodeURIComponent(date)}`, { headers });
            const jsonTrans = await resTrans.json().catch(() => null);
            
            if (resTrans.ok && isRecord(jsonTrans) && Array.isArray(jsonTrans.transactions)) {
                setTransactions(jsonTrans.transactions as SalesTransaction[]);
            } else {
                setTransactions([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("データの取得に失敗しました", "エラー");
        } finally {
            setFetching(false);
            setLoadingTransactions(false);
        }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serviceName || !amount) {
            toast.error("メニュー名と金額は必須です", "エラー");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                date,
                service_name: serviceName,
                amount: parseInt(amount, 10),
                customer_gender: gender,
                notes: notes
            };

            const res = await fetch("/api/staff/transactions", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...getHeaders()
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("保存に失敗しました");

            const json = await res.json();
            setTransactions([...transactions, json.transaction]);
            
            // Reset form
            setServiceName("");
            setAmount("");
            setNotes("");
            toast.success("記録を追加しました", "完了");
        } catch (error) {
            toast.error("保存に失敗しました", "エラー");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm("この記録を削除してもよろしいですか？")) return;

        try {
            const res = await fetch(`/api/staff/transactions/${id}`, {
                method: "DELETE",
                headers: getHeaders()
            });

            if (!res.ok) throw new Error("削除に失敗しました");

            setTransactions(transactions.filter(t => t.id !== id));
            toast.success("削除しました", "完了");
        } catch (error) {
            toast.error("削除に失敗しました", "エラー");
        }
    };

    const handleSubmitDailyReport = async () => {
        if (!confirm("本日の日報を送信しますか？送信後は修正できません。")) return;

        setSubmitting(true);
        try {
            const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
            const notesSummary = transactions.map(t => 
                `[${t.service_name}] ¥${t.amount.toLocaleString()} ${t.notes ? `(${t.notes})` : ''}`
            ).join('\n');

            const payload = {
                date: date,
                sales_amount: totalAmount,
                note: `【詳細記録あり】\n${notesSummary}`, // Auto-generate summary note
            };

            const res = await fetch("/api/staff/sales", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...getHeaders()
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("送信に失敗しました");

            const json = await res.json();
            setEntry(json.entry);
            toast.success("日報を送信しました！", "完了");
        } catch (error) {
            toast.error("送信に失敗しました", "エラー");
        } finally {
            setSubmitting(false);
        }
    };

    const isLocked = entry?.status === 'approved' || entry?.status === 'paid_locked' || entry?.status === 'submitted';
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    if (fetching) return <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary/50" /></div>;

    const statusColor = {
        draft: "bg-slate-100 text-slate-700",
        submitted: "bg-blue-100 text-blue-700 border-blue-200",
        approved: "bg-green-100 text-green-700 border-green-200",
        rejected: "bg-red-100 text-red-700 border-red-200",
        paid_locked: "bg-purple-100 text-purple-700 border-purple-200"
    };

    const statusLabel = {
        draft: "未提出",
        submitted: "提出済み",
        approved: "承認済み",
        rejected: "差戻し",
        paid_locked: "確定済み"
    };

    return (
        <div className="space-y-6">
            {/* 1. Date & Status Header */}
            <div className="flex items-center justify-between bg-white/50 backdrop-blur p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                     <CalendarIcon className="w-5 h-5 text-slate-500" />
                     <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-40 bg-transparent border-0 font-bold text-lg p-0 h-auto focus-visible:ring-0"
                    />
                </div>
                <Badge variant="outline" className={`px-3 py-1 ${statusColor[entry?.status || 'draft']}`}>
                    {statusLabel[entry?.status || 'draft']}
                </Badge>
            </div>

            {/* 2. Add Transaction Form (Only if not locked) */}
            {!isLocked && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                            <Plus className="w-5 h-5" /> お客様情報を追加
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs text-muted-foreground">メニュー・施術内容</Label>
                                    <Input 
                                        placeholder="例: 全身もみほぐし 60分" 
                                        value={serviceName}
                                        onChange={(e) => setServiceName(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">金額 (¥)</Label>
                                    <Input 
                                        type="number" 
                                        placeholder="0" 
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="bg-white font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">性別</Label>
                                    <Select value={gender} onValueChange={setGender}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="female">女性</SelectItem>
                                            <SelectItem value="male">男性</SelectItem>
                                            <SelectItem value="other">その他</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs text-muted-foreground">メモ (任意)</Label>
                                    <Textarea 
                                        placeholder="お客様の特徴や要望など..." 
                                        className="h-20 bg-white resize-none"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "記録を追加"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* 3. Transaction List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> 本日の記録
                    </h3>
                    <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        合計: ¥{totalAmount.toLocaleString()}
                    </span>
                </div>

                {loadingTransactions ? (
                    <div className="p-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-300" /></div>
                ) : transactions.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-sm">
                        まだ記録がありません
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transactions.map((t) => (
                            <div key={t.id} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-start justify-between group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">{t.service_name}</span>
                                        {t.customer_gender && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                                {t.customer_gender === 'female' ? '女性' : t.customer_gender === 'male' ? '男性' : '他'}
                                            </Badge>
                                        )}
                                    </div>
                                    {t.notes && <p className="text-xs text-slate-500">{t.notes}</p>}
                                    <p className="text-[10px] text-slate-400">{format(new Date(t.created_at), "HH:mm")} 追加</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="font-mono font-bold text-slate-700">¥{t.amount.toLocaleString()}</span>
                                    {!isLocked && (
                                        <button 
                                            onClick={() => handleDeleteTransaction(t.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Final Submit Button */}
            {!isLocked && transactions.length > 0 && (
                <Card className="border-indigo-100 bg-indigo-50/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4 text-indigo-900 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>
                                すべての入力を終えたら、日報を送信してください。<br/>
                                <span className="text-xs opacity-70">※送信後は編集できなくなります</span>
                            </p>
                        </div>
                        <Button 
                            onClick={handleSubmitDailyReport} 
                            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl transition-all"
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "日報を送信して業務終了"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isLocked && (
                <div className="p-4 bg-slate-100 rounded-xl flex items-center justify-center gap-2 text-slate-600 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    本日の日報は提出済みです
                </div>
            )}
            
            {/* Recent History Section */}
            {recentEntries.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-dashed border-slate-200">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-1">
                        <History className="w-4 h-4" />
                        <span>最近の履歴</span>
                    </div>
                    <div className="space-y-2">
                        {recentEntries.map((hist) => (
                            <div 
                                key={hist.id} 
                                className={cn(
                                    "rounded-lg bg-slate-50 border border-slate-100 transition-all overflow-hidden",
                                    expandedHistoryId === hist.id ? "ring-2 ring-indigo-100 bg-white" : "hover:bg-slate-100"
                                )}
                            >
                                <div 
                                    className="flex items-center justify-between p-3 cursor-pointer"
                                    onClick={() => setExpandedHistoryId(expandedHistoryId === hist.id ? null : hist.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-600">
                                            {format(new Date(hist.date), "M月d日 (E)", { locale: ja })}
                                        </span>
                                        {expandedHistoryId === hist.id ? <ChevronUp className="w-3 h-3 text-slate-400"/> : <ChevronDown className="w-3 h-3 text-slate-400"/>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700">¥{hist.sales_amount.toLocaleString()}</span>
                                        <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 ${statusColor[hist.status]}`}>
                                            {statusLabel[hist.status]}
                                        </Badge>
                                    </div>
                                </div>
                                
                                {expandedHistoryId === hist.id && (
                                    <div className="px-3 pb-3 pt-0 border-t border-slate-100">
                                        <div className="mt-2 text-xs text-slate-500 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded">
                                            {hist.note || "（詳細なし）"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
