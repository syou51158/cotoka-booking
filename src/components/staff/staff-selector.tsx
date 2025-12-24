"use client"

import { useState } from 'react'
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Lock, User, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface StaffSelectorProps {
    allStaff: any[];
    onSelect: (staffId: string) => void;
}

export function StaffSelector({ allStaff, onSelect }: StaffSelectorProps) {
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [verifying, setVerifying] = useState(false);

    const handleStaffClick = (staff: any) => {
        if (staff.pin_code) {
            setSelectedStaff(staff);
            setPin("");
            setError("");
        } else {
            // No PIN required
            onSelect(staff.id);
        }
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaff) return;

        if (pin === selectedStaff.pin_code) {
            onSelect(selectedStaff.id);
        } else {
            setError("PINコードが間違っています");
            setPin("");
        }
    };

    if (selectedStaff) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm shadow-xl border-0 bg-white/80 backdrop-blur">
                    <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
                        <div className="flex flex-col items-center gap-3">
                            <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                                <AvatarImage src={selectedStaff.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl">
                                    {selectedStaff.display_name?.substring(0, 2) || "ST"}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedStaff.display_name}</h3>
                                <p className="text-sm text-slate-500">PINコードを入力してください</p>
                            </div>
                        </div>

                        <form onSubmit={handlePinSubmit} className="space-y-4">
                            <div className="relative">
                                <Input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    className="text-center text-2xl tracking-[1em] h-14 font-mono"
                                    placeholder="••••"
                                    value={pin}
                                    onChange={(e) => {
                                        setPin(e.target.value);
                                        setError("");
                                    }}
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>}
                            
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setSelectedStaff(null)}
                                    className="h-12"
                                >
                                    戻る
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="h-12 bg-indigo-600 hover:bg-indigo-700"
                                    disabled={pin.length < 1}
                                >
                                    ログイン
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-md mx-auto space-y-8">
                <div className="text-center space-y-2 pt-8">
                    <h1 className="text-2xl font-bold text-slate-800">スタッフを選択</h1>
                    <p className="text-slate-500">業務を開始するスタッフを選択してください</p>
                </div>

                <div className="grid gap-3">
                    {allStaff.map((staff) => (
                        <button
                            key={staff.id}
                            onClick={() => handleStaffClick(staff)}
                            className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group text-left"
                        >
                            <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm group-hover:ring-indigo-100 transition-all">
                                <AvatarImage src={staff.avatar_url} />
                                <AvatarFallback className={cn(
                                    "text-white font-medium",
                                    staff.color ? "" : "bg-slate-400"
                                )} style={{ backgroundColor: staff.color }}>
                                    {staff.display_name?.substring(0, 1) || "S"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                                    {staff.display_name}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {staff.role === 'contractor' ? '業務委託' : '社員/アルバイト'}
                                </p>
                            </div>
                            {staff.pin_code ? (
                                <Lock className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="text-center pt-4">
                    <Link href="/admin/dashboard" className="text-sm text-slate-400 hover:text-indigo-600 underline underline-offset-4">
                        管理者ダッシュボードに戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
