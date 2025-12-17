
import { getCustomer } from "@/server/customers";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Mail, Phone, Calendar, ArrowLeft, Clock, Banknote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function CustomerDetailPage(props: {
    params: Promise<{ id: string }>;
}) {
    const params = await props.params;
    const customer = await getCustomer(params.id);

    if (!customer) {
        notFound();
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Back Button */}
            <Link
                href="/admin/customers"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                顧客一覧に戻る
            </Link>

            {/* Profile Header */}
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold text-white mb-2">{customer.name}</h1>
                        <div className="flex flex-wrap gap-4 text-slate-300">
                            <div className="flex items-center gap-2 bg-black/20 py-1 px-3 rounded-full border border-white/5">
                                <Mail className="w-4 h-4 text-primary" />
                                {customer.email}
                            </div>
                            {customer.phone && (
                                <div className="flex items-center gap-2 bg-black/20 py-1 px-3 rounded-full border border-white/5">
                                    <Phone className="w-4 h-4 text-primary" />
                                    {customer.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <div className="text-center p-4 bg-black/20 rounded-xl border border-white/5 min-w-[120px]">
                            <div className="text-3xl font-bold text-white">{customer.total_visits}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Visits</div>
                        </div>
                        <div className="text-center p-4 bg-black/20 rounded-xl border border-white/5 min-w-[140px]">
                            <div className="text-3xl font-bold text-primary">¥{customer.total_spent.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Total Spent</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reservation History */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    予約履歴
                </h2>
                <div className="glass-panel rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/5 bg-black/20">
                                <th className="p-4 text-slate-400 font-medium">日時</th>
                                <th className="p-4 text-slate-400 font-medium">予約コード</th>
                                <th className="p-4 text-slate-400 font-medium">金額</th>
                                <th className="p-4 text-slate-400 font-medium">ステータス</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {customer.history.map((r) => (
                                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="text-white font-medium">
                                            {format(new Date(r.start_at), "yyyy/MM/dd HH:mm", { locale: ja })}
                                        </div>
                                    </td>
                                    <td className="p-4 text-mono text-slate-400">
                                        {r.code}
                                    </td>
                                    <td className="p-4 text-white">
                                        ¥{r.amount_total_jpy.toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <Badge variant={
                                            r.status === 'completed' || r.status === 'paid' ? 'default' :
                                                r.status === 'canceled' ? 'destructive' : 'secondary'
                                        } className="capitalize">
                                            {r.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
