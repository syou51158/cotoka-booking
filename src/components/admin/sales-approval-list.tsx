"use client";

import { useState } from "react";
import { SalesEntryWithStaff, updateEntryStatus } from "@/app/admin/(protected)/sales/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

export function SalesApprovalList({ initialEntries }: { initialEntries: SalesEntryWithStaff[] }) {
    const [entries, setEntries] = useState(initialEntries);
    const [processing, setProcessing] = useState<string | null>(null);

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        setProcessing(id);
        try {
            await updateEntryStatus(id, action);
            setEntries(prev => prev.filter(e => e.id !== id));
            toast.success(action === 'approved' ? "承認しました" : "却下しました", "完了");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message, "エラー");
        } finally {
            setProcessing(null);
        }
    };

    if (entries.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    承認待ちの日報はありません。
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>承認待ち一覧</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>日付</TableHead>
                            <TableHead>スタッフ</TableHead>
                            <TableHead>売上金額</TableHead>
                            <TableHead>備考</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.map(entry => (
                            <TableRow key={entry.id}>
                                <TableCell>{entry.date}</TableCell>
                                <TableCell>{entry.staff.display_name}</TableCell>
                                <TableCell>¥{entry.sales_amount.toLocaleString()}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={entry.note || ""}>{entry.note}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleAction(entry.id, 'approved')}
                                        disabled={!!processing}
                                    >
                                        {processing === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleAction(entry.id, 'rejected')}
                                        disabled={!!processing}
                                    >
                                        {processing === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
