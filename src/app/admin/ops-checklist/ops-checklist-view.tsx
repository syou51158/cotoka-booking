"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TaskStatus = "pending" | "done" | "skipped";

type Task = {
  id: string;
  bucket: "now" | "later";
  title: string;
  description: string;
  command: string;
};

const STORAGE_KEY = "cotoka-ops-checklist";

const TASKS: Task[] = [
  {
    id: "now-dev1",
    bucket: "now",
    title: "DEV-1 モック完了UI",
    description:
      "確認画面のDEVバナーから擬似決済ボタンで /success まで遷移できることを確認。",
    command: "open http://localhost:3000/ja/booking",
  },
  {
    id: "now-dev2",
    bucket: "now",
    title: "DEV-2 スモークテスト",
    description:
      "CLI で予約→擬似決済→リマインダーまで自動検証する `npm run smoke` を実行。",
    command: "npm run smoke",
  },
  {
    id: "now-dev4",
    bucket: "now",
    title: "DEV-4 Reminders窓柔軟化",
    description:
      "shiftMinutes + windowXXm パラメータで通知窓を動かせることを確認。",
    command:
      "curl 'http://localhost:3000/api/cron/reminders?shiftMinutes=1440&window24m=180'",
  },
  {
    id: "now-1",
    bucket: "now",
    title: "Stripe success/cancel ロケール対応",
    description:
      "mock checkout で rid を取得し、/ja/success?rid=… で 404 にならないことを確認。",
    command: "open http://localhost:3000/ja/success?rid=<RID>",
  },
  {
    id: "now-2",
    bucket: "now",
    title: "Prettier / Husky (ローカル)",
    description:
      "pre-commit で lint / typecheck / format:check が動作するか確認。",
    command: "npm run lint && npm run typecheck && npm run format:check",
  },
  {
    id: "now-3",
    bucket: "now",
    title: "通知ログテーブル + 手動トリガ",
    description:
      "Cron 手動実行で reservation_notifications にレコードが作成されるか確認。",
    command: "curl http://localhost:3000/api/cron/reminders",
  },
  {
    id: "now-4",
    bucket: "now",
    title: "管理台帳フィルタ + メモ/キャンセル",
    description:
      "/admin でフィルタ操作とメモ保存・キャンセルが反映されることを確認。",
    command: "open http://localhost:3000/admin",
  },
  {
    id: "now-5",
    bucket: "now",
    title: "/manage 本人照合 + events 記録",
    description:
      "code + email/phone で照合し、manage_* 系イベントが events に記録されることを確認。",
    command: "open http://localhost:3000/ja/manage",
  },
  {
    id: "now-6",
    bucket: "now",
    title: ".ics + 成功ページ充実",
    description:
      "成功ページから .ics ダウンロードと Google/Apple 追加が機能することを確認。",
    command: "open http://localhost:3000/ja/success?rid=<RID>",
  },
  {
    id: "now-7",
    bucket: "now",
    title: "JSON-LD + 地図/口コミ導線",
    description: "schema.org の埋め込みと /booking の地図・口コミ導線を確認。",
    command: "open http://localhost:3000/ja/booking",
  },
  {
    id: "later-1",
    bucket: "later",
    title: "Vercel Cron 有効化",
    description: "Vercel プロジェクトに毎時 /api/cron/reminders を登録。",
    command: 'vercel cron add "0 * * * *" /api/cron/reminders',
  },
  {
    id: "later-2",
    bucket: "later",
    title: "E2E (Playwright)",
    description: "重複予約・休業日枠・決済フローの E2E を整備。",
    command: "npx playwright test",
  },
  {
    id: "later-3",
    bucket: "later",
    title: "/manage の本格 RLS 化",
    description:
      "Supabase RLS + Edge Functions 等で /manage API の認可を再設計。",
    command: "todo: design manage RLS policy",
  },
  {
    id: "later-4",
    bucket: "later",
    title: "返金 UI / 簡易分析",
    description: "Stripe 返金フローと売上・稼働率のダッシュボード追加。",
    command: "todo: prepare refund + analytics spec",
  },
  {
    id: "later-5",
    bucket: "later",
    title: "RateLimit / CAPTCHA",
    description: "予約・API・ログインの RateLimit と CAPTCHA 対策を導入。",
    command: "todo: evaluate rate limit middleware",
  },
  {
    id: "later-6",
    bucket: "later",
    title: "監視 / バックアップ運用",
    description:
      "Vercel / Stripe / Supabase の監視とバックアップ運用を整備しドキュメント化。",
    command: "todo: document monitoring & backup SOP",
  },
];

const buckets: Array<"now" | "later"> = ["now", "later"];

export default function OpsChecklistView() {
  const [activeBucket, setActiveBucket] = useState<"now" | "later">("now");
  const [taskStatus, setTaskStatus] = useState<Record<string, TaskStatus>>({});
  const [copiedTask, setCopiedTask] = useState<string | null>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, TaskStatus>;
        setTaskStatus(parsed);
      } catch (err) {
        console.warn("Failed to parse ops checklist storage", err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taskStatus));
  }, [taskStatus]);

  useEffect(() => {
    if (!copiedTask) return;
    const timer = setTimeout(() => setCopiedTask(null), 1500);
    return () => clearTimeout(timer);
  }, [copiedTask]);

  const tasksForBucket = useMemo(
    () => TASKS.filter((task) => task.bucket === activeBucket),
    [activeBucket],
  );

  const completedCount = tasksForBucket.filter(
    (task) => taskStatus[task.id] === "done",
  ).length;
  const skippedCount = tasksForBucket.filter(
    (task) => taskStatus[task.id] === "skipped",
  ).length;
  const progressPercentage = tasksForBucket.length
    ? Math.round((completedCount / tasksForBucket.length) * 100)
    : 0;

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    setTaskStatus((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === status ? "pending" : status,
    }));
  };

  const handleCopy = async (command: string, taskId: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedTask(taskId);
    } catch (err) {
      console.error("Failed to copy command", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Admin Ops Checklist
          </h1>
          <p className="text-sm text-slate-400">
            NOW と LATER のタスクをローカルで管理できます。
          </p>
        </div>
        <div className="flex gap-2">
          {buckets.map((bucket) => (
            <Button
              key={bucket}
              variant={activeBucket === bucket ? "default" : "outline"}
              className={
                activeBucket === bucket
                  ? "bg-emerald-500 text-white"
                  : "border-slate-700 text-slate-900 bg-white hover:bg-slate-100"
              }
              onClick={() => setActiveBucket(bucket)}
            >
              {bucket === "now" ? "NOW" : "LATER"}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>
            完了 {completedCount} / {tasksForBucket.length}
          </span>
          <span>スキップ {skippedCount}</span>
        </div>
        <div className="h-2 w-full rounded bg-slate-800">
          <div
            className="h-2 rounded bg-emerald-500 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {tasksForBucket.map((task) => {
          const status = taskStatus[task.id] ?? "pending";
          return (
            <Card key={task.id} className="border-slate-800 bg-slate-950/40">
              <CardHeader>
                <CardTitle className="text-base text-slate-100">
                  {task.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <p>{task.description}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <code className="w-full rounded bg-slate-900 px-3 py-2 text-xs text-emerald-300 sm:w-auto">
                    {task.command}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto text-slate-900"
                    onClick={() => handleCopy(task.command, task.id)}
                  >
                    {copiedTask === task.id ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={status === "done" ? "default" : "outline"}
                    size="sm"
                    className={
                      status === "done"
                        ? "bg-emerald-500 text-white"
                        : "border-slate-700 text-slate-900 bg-white hover:bg-slate-100"
                    }
                    onClick={() => handleStatusChange(task.id, "done")}
                  >
                    Done
                  </Button>
                  <Button
                    variant={status === "skipped" ? "default" : "outline"}
                    size="sm"
                    className={
                      status === "skipped"
                        ? "bg-amber-500 text-white"
                        : "border-slate-700 text-slate-900 bg-white hover:bg-slate-100"
                    }
                    onClick={() => handleStatusChange(task.id, "skipped")}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-slate-200"
                    onClick={() => handleStatusChange(task.id, "pending")}
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
