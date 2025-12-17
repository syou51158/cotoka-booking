
import { getAllStaff } from "@/server/staff";
import { Plus, User, Shield, Briefcase, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function StaffPage() {
    const staffList = await getAllStaff();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md mb-2">
                        スタッフ管理
                    </h1>
                    <p className="text-slate-400">
                        セラピスト・従業員の登録と権限管理を行います。
                    </p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20">
                    <Plus className="w-4 h-4" />
                    新規登録
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffList.map((staff) => (
                    <div key={staff.id} className="glass-panel p-6 rounded-2xl group hover:border-slate-700 transition-all duration-200 relative overflow-hidden">

                        <div className="relative z-10 flex items-start justify-between mb-6">
                            <div className="h-14 w-14 rounded-full flex items-center justify-center border-2 border-white/10 shadow-xl" style={{ backgroundColor: staff.color || '#64748B' }}>
                                <User className="h-6 w-6 text-white" />
                            </div>
                            <Badge
                                variant={staff.active ? "default" : "secondary"}
                                className={staff.active ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/50" : ""}
                            >
                                {staff.active ? "Active" : "Inactive"}
                            </Badge>
                        </div>

                        <div className="relative z-10 mb-4">
                            <h3 className="text-xl font-bold text-white transition-all">{staff.display_name}</h3>
                            {staff.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                    <Mail className="w-3 h-3" />
                                    {staff.email}
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 flex items-center gap-2 mb-6">
                            <Badge variant="outline" className="border-white/10 bg-black/20 text-slate-300 gap-1 pb-1">
                                {staff.role === 'admin' ? <Shield className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                                <span className="capitalize">{staff.role}</span>
                            </Badge>
                        </div>

                        <div className="relative z-10 pt-4 border-t border-white/5 flex gap-2">
                            <Button variant="ghost" className="w-full hover:bg-white/10 text-slate-300 hover:text-white">
                                詳細・編集
                            </Button>
                        </div>
                    </div>
                ))}

                {/* Empty State / Add New Card */}
                <button className="border border-dashed border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[250px] group">
                    <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-medium">新しいスタッフを登録</span>
                </button>
            </div>
        </div>
    );
}
