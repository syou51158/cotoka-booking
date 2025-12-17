"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RewardTimeline() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const res = await fetch("/api/contractor/rewards", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setRewards(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">読み込み中...</div>;
  }

  if (rewards.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        まだ報酬履歴がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rewards.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardHeader className="bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {format(new Date(item.created_at), "M月d日 HH:mm", {
                  locale: ja,
                })}
              </span>
              <Badge
                variant={
                  item.status === "paid"
                    ? "default"
                    : item.status === "approved"
                    ? "secondary"
                    : "outline"
                }
              >
                {item.status === "draft"
                  ? "下書き"
                  : item.status === "approved"
                  ? "承認済み"
                  : "支払済み"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-lg">
                  {item.reservation?.service?.name || "サービス不明"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.reservation?.customer_name} 様
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  ¥{item.reward_amount_jpy.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  売上: ¥{item.total_sales_jpy.toLocaleString()}
                </p>
              </div>
            </div>
            {item.note && (
              <div className="mt-3 rounded bg-muted/50 p-2 text-sm">
                {item.note}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
