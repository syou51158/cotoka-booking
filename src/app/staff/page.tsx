"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { TimeCard } from "@/components/employee/time-card";
import { RewardTimeline } from "@/components/contractor/reward-timeline";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function StaffPortalPage() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"timecard" | "rewards">("timecard");
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (!session) {
                // In real app, redirect to login
                // router.push("/login?redirect=/staff");
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 space-y-4">
                <h1 className="text-2xl font-bold">Staff Portal</h1>
                <p className="text-muted-foreground text-center">
                    ログインが必要です。
                </p>
                <Button asChild>
                    <Link href="/login">Login Page (Demo)</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-20">
            <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur border-b">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary text-xs">CO</span>
                    </div>
                    <span className="font-semibold text-sm">Staff Portal</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {session.user.email}
                    </span>
                </div>
            </header>

            <main className="p-4 max-w-md mx-auto">
                <div className="w-full mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
                    <button
                        onClick={() => setActiveTab("timecard")}
                        className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                            activeTab === "timecard" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"
                        )}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setActiveTab("rewards")}
                        className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                            activeTab === "rewards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"
                        )}
                    >
                        History
                    </button>
                </div>

                {activeTab === "timecard" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <TimeCard />

                        <div className="space-y-2 pt-4 border-t">
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Today's Tasks</h3>
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                                    本日の予約はありません
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "rewards" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <RewardTimeline />
                    </div>
                )}
            </main>
        </div>
    );
}
