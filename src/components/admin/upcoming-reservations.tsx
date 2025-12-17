import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarClock, ArrowRight } from "lucide-react";

type Reservation = {
    id: string;
    start_at: string;
    status: string;
    customer_name?: string | null;
    service?: { name: string } | null;
    staff?: { display_name: string } | null;
    amount_total_jpy: number;
};

export function UpcomingReservationsList({ reservations }: { reservations: Reservation[] }) {
    if (reservations.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        これからの予約
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[200px] flex-col items-center justify-center text-sm text-muted-foreground">
                        <p>本日の予約はありません</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        これからの予約
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                        <Link href="/admin/reservations">
                            すべて見る <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
                <div className="divide-y">
                    {reservations.map((res) => (
                        <div key={res.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center justify-center min-w-[50px] rounded bg-muted/50 p-1">
                                    <span className="text-xs font-bold text-foreground">
                                        {format(new Date(res.start_at), "HH:mm")}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {res.customer_name || "ゲスト"} 様
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {res.service?.name || "メニュー未定"}
                                        <span className="mx-1">·</span>
                                        {res.staff?.display_name || "担当なし"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        res.status === "confirmed" ? "default" :
                                            res.status === "completed" ? "secondary" :
                                                "outline"
                                    }
                                    className="text-[10px]"
                                >
                                    {res.status === "confirmed" ? "確定" :
                                        res.status === "completed" ? "完了" :
                                            res.status === "pending" ? "未決済" : res.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
