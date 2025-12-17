
import { getCustomers } from "@/server/customers";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Search, Mail, Phone, Calendar, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function CustomersPage(props: {
    searchParams?: Promise<{ q?: string }>;
}) {
    const searchParams = await props.searchParams;
    const query = searchParams?.q || "";
    const customers = await getCustomers(query);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md mb-2">
                        顧客管理
                    </h1>
                    <p className="text-slate-400">
                        全顧客の予約履歴とステータスを一元管理します。
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="glass-panel p-2 rounded-xl flex items-center gap-4 max-w-md focus-within:ring-2 ring-primary/50 transition-all">
                <Search className="w-5 h-5 text-slate-500 ml-2" />
                <form className="flex-1">
                    <input
                        name="q"
                        defaultValue={query}
                        placeholder="名前、メール、電話番号で検索..."
                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500"
                    />
                </form>
            </div>

            {/* Glass Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-700 bg-slate-900">
                                <th className="p-4 pl-6 font-medium text-slate-400 text-sm">顧客名</th>
                                <th className="p-4 font-medium text-slate-400 text-sm">連絡先</th>
                                <th className="p-4 font-medium text-slate-400 text-sm">来店実績</th>
                                <th className="p-4 font-medium text-slate-400 text-sm">最終来店日</th>
                                <th className="p-4 font-medium text-slate-400 text-sm text-right pr-6">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        顧客データが見つかりません。
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="group hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="font-semibold text-white group-hover:text-primary transition-colors">
                                                {customer.name}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Mail className="w-3 h-3 text-slate-500" />
                                                    {customer.email}
                                                </div>
                                                {customer.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                                        <Phone className="w-3 h-3 text-slate-500" />
                                                        {customer.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <div className="text-xl font-bold text-white leading-none">
                                                        {customer.total_visits}
                                                    </div>
                                                    <div className="text-[10px] uppercase text-slate-500 tracking-wider">
                                                        Visits
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-white/10" />
                                                <div>
                                                    <div className="font-mono text-white">
                                                        ¥{customer.total_spent.toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] uppercase text-slate-500 tracking-wider">
                                                        Total
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Calendar className="w-4 h-4 text-slate-500" />
                                                {format(new Date(customer.last_visit), "yyyy/MM/dd", { locale: ja })}
                                            </div>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <Link href={`/admin/customers/${encodeURIComponent(customer.id)}`}>
                                                <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                                    <ArrowUpRight className="w-5 h-5" />
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
