"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X } from "lucide-react";

interface RewardReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  initialTotalSales?: number;
  onSaved?: () => void;
}

export function RewardReportModal({
  isOpen,
  onClose,
  reservationId,
  initialTotalSales = 0,
  onSaved,
}: RewardReportModalProps) {
  const [totalSales, setTotalSales] = useState(initialTotalSales);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Please login first");
        return;
      }

      const res = await fetch("/api/contractor/rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reservationId,
          totalSales,
          note,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data = await res.json();
      setResult(data);
      if (onSaved) onSaved();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <CardHeader>
          <CardTitle>施術報告 & 報酬計算</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sales">売上合計 (税込)</Label>
            <Input
              id="sales"
              type="number"
              value={totalSales}
              onChange={(e) => setTotalSales(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">メモ / 報告事項</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="追加の施術内容や特記事項があれば記載してください"
            />
          </div>

          {result && (
            <div className="rounded-md bg-muted p-4 text-sm">
              <p className="font-bold text-primary">計算結果 (下書き保存済み)</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">適用レート:</span>
                <span>
                  {result.commission_rate}
                  {result.calc_source?.rule?.rate_type === "fixed" ? "円" : "%"}
                </span>
                <span className="text-muted-foreground">報酬額:</span>
                <span className="font-bold text-lg">
                  ¥{result.reward_amount_jpy.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            {result ? "閉じる" : "キャンセル"}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "計算中..." : result ? "再計算・更新" : "報告して保存"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
