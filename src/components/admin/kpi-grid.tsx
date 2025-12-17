import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Calendar, Users, AlertCircle } from "lucide-react";

type SummaryData = {
    sales: { total: number; count: number };
    rewards: { total: number; count: number };
    attendance: { totalMinutes: number; formatted: string };
};

export function KPIGrid({ data }: { data: SummaryData }) {
    // Mocking "Pending" data for now as it requires broader query
    const pendingCount = 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        今月の売上 (確定)
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.sales.total)}</div>
                    <p className="text-xs text-muted-foreground">
                        予約 {data.sales.count} 件
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        報酬支払予定
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.rewards.total)}</div>
                    <p className="text-xs text-muted-foreground">
                        承認/下書き {data.rewards.count} 件
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        総労働時間
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.attendance.formatted}</div>
                    <p className="text-xs text-muted-foreground">
                        稼働実績
                    </p>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        アクション必要
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingCount}</div>
                    <p className="text-xs text-muted-foreground">
                        未払い・未報告など
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
