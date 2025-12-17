
import { CalendarDays, TrendingUp, Users, DollarSign, ArrowUp, ArrowDown } from "lucide-react";

export default function ReportsPage() {
    // Mock Data for UI Visualization
    const dailyStats = [
        { day: "Mon", sales: 45000, visits: 8 },
        { day: "Tue", sales: 32000, visits: 6 },
        { day: "Wed", sales: 58000, visits: 12 },
        { day: "Thu", sales: 42000, visits: 9 },
        { day: "Fri", sales: 85000, visits: 15 },
        { day: "Sat", sales: 120000, visits: 22 },
        { day: "Sun", sales: 98000, visits: 18 },
    ];

    const maxSales = Math.max(...dailyStats.map(d => d.sales));

    const popularMenus = [
        { name: "カット & カラー", count: 45, revenue: 450000 },
        { name: "プレミアムトリートメント", count: 32, revenue: 192000 },
        { name: "ヘッドスパ (60min)", count: 28, revenue: 168000 },
        { name: "メンズカット", count: 25, revenue: 125000 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md mb-2">
                        レポート & 分析
                    </h1>
                    <p className="text-slate-400">
                        売上推移とトレンドを可視化します。(デモデータ表示中)
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                        先週
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/50 text-sm text-primary font-medium">
                        今週
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                        先月
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "週間売上", value: "¥480,000", change: "+12.5%", icon: DollarSign, trend: "up" },
                    { label: "来店数", value: "90", change: "+5.2%", icon: Users, trend: "up" },
                    { label: "客単価", value: "¥5,333", change: "-2.1%", icon: TrendingUp, trend: "down" },
                    { label: "予約率", value: "85%", change: "+0.4%", icon: CalendarDays, trend: "up" },
                ].map((stat, i) => (
                    <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className="relative z-10 flex justify-between items-start mb-4">
                            <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                <stat.icon className="w-5 h-5 text-slate-300" />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {stat.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                {stat.change}
                            </div>
                        </div>
                        <div className="relative z-10">
                            <div className="text-2xl font-bold text-white mb-1 group-hover:text-glow transition-all">{stat.value}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weekly Sales Chart (CSS) */}
                <div className="glass-panel p-8 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">週間売上推移</h3>
                    <div className="flex items-end justify-between h-64 gap-2">
                        {dailyStats.map((d) => (
                            <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full relative flex-1 flex items-end">
                                    <div
                                        className="w-full bg-slate-800 rounded-t-lg group-hover:bg-primary transition-all duration-500 relative overflow-hidden"
                                        style={{ height: `${(d.sales / maxSales) * 100}%` }}
                                    >
                                        <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 font-medium group-hover:text-white transition-colors">{d.day}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Popular Menus */}
                <div className="glass-panel p-8 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">人気メニュー Top 5</h3>
                    <div className="space-y-6">
                        {popularMenus.map((menu, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-300 font-medium">{menu.name}</span>
                                    <span className="text-slate-400">{menu.count}回</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500"
                                        style={{ width: `${(menu.count / 50) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
