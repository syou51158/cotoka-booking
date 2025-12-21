
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    CalendarDays,
    Users,
    Scissors,
    UserCog,
    BarChart3,
    Settings,
    ClipboardList,
    LogOut,
    Sparkles,
    CalendarClock,
    Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/config";
import { logout } from "@/app/login/actions";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AppSidebar({ className }: SidebarProps) {
    const pathname = usePathname();

    const routes = [
        {
            label: "Main",
            items: [
                {
                    label: "ダッシュボード",
                    icon: LayoutDashboard,
                    href: "/admin/dashboard",
                    active: pathname === "/admin/dashboard",
                },
                {
                    label: "予約台帳",
                    icon: CalendarDays,
                    href: "/admin/reservations",
                    active: pathname === "/admin/reservations",
                },
            ],
        },
        {
            label: "Management",
            items: [
                {
                    label: "顧客管理",
                    icon: Users,
                    href: "/admin/customers",
                    active: pathname.startsWith("/admin/customers"),
                },
                {
                    label: "メニュー管理",
                    icon: Scissors,
                    href: "/admin/services",
                    active: pathname.startsWith("/admin/services"),
                },
                {
                    label: "スタッフ管理",
                    icon: UserCog,
                    href: "/admin/staff",
                    active: pathname.startsWith("/admin/staff"),
                },
                {
                    label: "シフト管理",
                    icon: CalendarClock,
                    href: "/admin/shifts",
                    active: pathname.startsWith("/admin/shifts"),
                },
                {
                    label: "売上管理",
                    icon: Banknote,
                    href: "/admin/sales",
                    active: pathname.startsWith("/admin/sales"),
                },
            ],
        },
        {
            label: "Analytics",
            items: [
                {
                    label: "レポート",
                    icon: BarChart3,
                    href: "/admin/reports",
                    active: pathname.startsWith("/admin/reports"),
                },
            ],
        },
        {
            label: "System",
            items: [
                {
                    label: "営業設定",
                    icon: Settings,
                    href: "/admin/schedule",
                    active: pathname.startsWith("/admin/schedule"),
                },
                {
                    label: "システム設定",
                    icon: Sparkles,
                    href: "/admin/settings",
                    active: pathname.startsWith("/admin/settings"),
                },
                {
                    label: "Opsチェック",
                    icon: ClipboardList,
                    href: "/admin/ops-checklist",
                    active: pathname.startsWith("/admin/ops-checklist"),
                },
            ],
        },
    ];

    return (
        <div className={cn("pb-4 min-h-screen w-64 glass-sidebar transition-all duration-300 flex flex-col", className)}>
            <div className="space-y-4 py-4 flex-1 overflow-y-auto">
                <div className="px-6 py-4">
                    <Link href="/admin" className="flex items-center gap-2 group">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
                            {SITE_NAME}
                        </h2>
                    </Link>
                </div>
                <div className="px-3 py-2">
                    <div className="space-y-1">
                        {routes.map((group, i) => (
                            <div key={i} className="mb-6">
                                <h3 className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {group.label}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((route) => (
                                        <Link
                                            key={route.href}
                                            href={route.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 border border-transparent",
                                                route.active
                                                    ? "bg-primary/10 text-primary border-primary/20"
                                                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <route.icon className={cn("h-4 w-4", route.active ? "text-primary" : "text-slate-400 group-hover:text-white")} />
                                            {route.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6 mt-auto border-t border-slate-800">
                <form action={logout}>
                    <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-start gap-2 border-slate-700 bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600"
                    >
                        <LogOut className="h-4 w-4" />
                        ログアウト
                    </Button>
                </form>
            </div>
        </div>
    );
}
