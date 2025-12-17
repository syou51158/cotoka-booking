import { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { currentProjectRef, EXPECTED_PROJECT_REF } from "@/lib/env";
import { AppSidebar } from "@/components/admin/app-sidebar";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="dark flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black text-slate-100">
      {/* Fixed Sidebar */}
      <AppSidebar className="hidden md:block shrink-0" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Environment banner showing Supabase project ref */}
        {(() => {
          const mismatch =
            currentProjectRef && currentProjectRef !== EXPECTED_PROJECT_REF;
          if (!mismatch && !currentProjectRef) return null; // Don't show if normal production or not set to avoid noise? Or show always as before. 
          // Keeping consistent with previous logic: show if set.

          const base = "border-b text-xs";
          const okStyle = "border-slate-800 bg-slate-900 text-slate-400";
          const badStyle = "border-red-900 bg-red-900/20 text-red-200";
          const style = `${base} ${mismatch ? badStyle : okStyle}`;

          return (
            <div className={style}>
              <div className="px-6 py-2 flex items-center gap-4">
                <span>DB: {currentProjectRef ?? "(未設定)"}</span>
                {mismatch && (
                  <span className="font-semibold bg-red-900/50 px-2 py-0.5 rounded text-red-100">
                    Mismatch: 期待値 {EXPECTED_PROJECT_REF}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        <main className="flex-1 overflow-y-auto p-8 text-slate-100">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
