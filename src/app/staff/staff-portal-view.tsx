"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, User, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { WeatherCard } from "@/components/staff/weather-card";
import { useRouter } from "next/navigation";
import { DailySalesForm } from "@/components/staff/daily-sales-form";
import { TimeCard } from "@/components/employee/time-card";
import { StaffSelector } from "@/components/staff/staff-selector";

interface Props {
  user: any;
  staffProfile: any;
  allStaff?: any[];
}

export function StaffPortalView({ user, staffProfile, allStaff = [] }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("sales");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const isAdmin = staffProfile?.role === 'admin';
  const effectiveStaffId = isAdmin ? selectedStaffId : staffProfile?.id;

  // If Admin and no staff selected, show the selector
  if (isAdmin && !selectedStaffId) {
    return (
      <StaffSelector
        allStaff={allStaff}
        onSelect={(id) => setSelectedStaffId(id)}
      />
    );
  }

  // Determine display name
  let displayName = staffProfile?.display_name || user.email;
  if (isAdmin && selectedStaffId) {
    const target = allStaff.find(s => s.id === selectedStaffId);
    if (target) displayName = target.display_name;
  }

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleSwitchUser = () => {
    setSelectedStaffId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Mobile Header */}
      <header className="bg-white border-b sticky top-0 z-10 safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {displayName?.[0] || <User className="w-4 h-4" />}
            </div>
            <span className="font-bold text-slate-700 text-sm truncate max-w-[120px]">
              {displayName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                onClick={handleSwitchUser}
              >
                <Users className="w-4 h-4 mr-1" />
                切替
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-600"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="pt-2 pb-1">
          <WeatherCard />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sales">売上報告</TabsTrigger>
            <TabsTrigger value="attendance">勤怠・活動</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4 focus-visible:ring-0">
            <DailySalesForm user={user} staffId={effectiveStaffId} />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4 focus-visible:ring-0">
            <TimeCard staffId={effectiveStaffId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
