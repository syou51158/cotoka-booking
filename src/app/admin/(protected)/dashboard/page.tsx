import Link from "next/link";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowUpRight, TrendingUp, Users, Calendar, AlertCircle, Store } from "lucide-react";
import { RealtimeStaffStatus } from "@/components/admin/realtime-staff-status";
import { getAdminReservations } from "@/server/admin";
import { getRealtimeStaffStatus, getDashboardSummary } from "@/server/admin-dashboard";

export default async function AdminDashboardPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [summaryData, todayReservations, realtimeStatus] = await Promise.all([
    getDashboardSummary(monthStart.toISOString(), monthEnd.toISOString()),
    getAdminReservations({ from: todayStart.toISOString(), to: todayEnd.toISOString() }),
    getRealtimeStaffStatus(),
  ]);

  const sortedReservations = [...todayReservations]
    .filter(r => r.status !== "canceled")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  // Helper to format currency
  const fmtYen = (n: number) => `¥${n.toLocaleString()}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md mb-2">
            Dashboard
          </h1>
          <p className="text-slate-400">
            {format(now, "yyyy年M月d日 (E)", { locale: ja })} の状況サマリー
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/staff" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 text-emerald-400 transition-colors text-sm font-medium">
            <Store className="w-4 h-4" />
            スタッフポータル
          </Link>
          <Link href="/admin/reservations" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-slate-300 transition-colors text-sm">
            予約台帳へ
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Grid (Glass) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "今月の売上 (確定)", value: fmtYen(summaryData.sales.total), icon: TrendingUp, sub: `${summaryData.sales.count} 件の予約` },
          { label: "報酬支払予定", value: fmtYen(summaryData.sales.total * 0.4), icon: Users, sub: "推定 (40%)" }, // Mock calculation or real if available
          { label: "総労働時間", value: summaryData.attendance.formatted, icon: Calendar, sub: "稼働実績" },
          { label: "アクション必要", value: "0", icon: AlertCircle, sub: "承認待ち・未報告", warning: true }
        ].map((kpi, i) => (
          <div key={i} className={`glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all duration-200`}>
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border ${kpi.warning ? 'bg-rose-950/30 border-rose-900 text-rose-400' : 'bg-slate-800 border-slate-700 text-primary'}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>

            <div className="relative z-10">
              <div className={`text-3xl font-bold mb-1 ${kpi.warning ? 'text-rose-400' : 'text-white'}`}>{kpi.value}</div>
              <div className="text-sm text-slate-400 font-medium mb-1">{kpi.label}</div>
              <div className="text-xs text-slate-500">{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Realtime Status */}
        <div className="glass-panel p-6 rounded-2xl h-fit">
          <h2 className="text-lg font-bold text-white mb-4">リアルタイム状況</h2>
          <RealtimeStaffStatus initialData={realtimeStatus} />
        </div>

        {/* Upcoming Reservations */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">これからの予約</h2>
            <div className="text-xs text-slate-500">本日 {sortedReservations.length} 件</div>
          </div>

          {/* We need to update UpcomingReservationsList to transparent/dark mode too. 
                 If it is a client component, we should check it. 
                 For now, passing data. Ideally I should refactor the component itself if it has hardcoded styles. 
                 But let's assume global overrides or simple structure for now. */}
          <div className="space-y-3">
            {sortedReservations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">
                本日の予約はありません
              </div>
            ) : (
              sortedReservations.map((res) => (
                <div key={res.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="text-center min-w-[60px]">
                    <div className="text-lg font-bold text-white">{format(new Date(res.start_at), "HH:mm")}</div>
                    <div className="text-xs text-slate-500">{res.service?.duration_min ?? "?"}min</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{res.customer_name}</span>
                      <span className="text-xs text-slate-400">様</span>
                    </div>
                    <div className="text-xs text-primary">{res.service?.name ?? "メニュー未定"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-slate-300">¥{res.amount_total_jpy.toLocaleString()}</div>
                    <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${res.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'
                      }`}>
                      {res.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
