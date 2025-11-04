import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { currentProjectRef, EXPECTED_PROJECT_REF } from "@/lib/env";
import { logout } from "../(auth)/login/actions";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="text-lg font-semibold text-white">
            Cotoka Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-slate-200 hover:text-white">
              予約台帳
            </Link>
            <Link
              href="/admin/schedule"
              className="text-slate-200 hover:text-white"
            >
              営業設定
            </Link>
            <Link
              href="/admin/ops-checklist"
              className="text-slate-200 hover:text-white"
            >
              Opsチェック
            </Link>
            <form action={logout}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-200"
              >
                ログアウト
              </Button>
            </form>
          </nav>
        </div>
        {/* Environment banner showing Supabase project ref */}
        {(() => {
          const mismatch =
            currentProjectRef && currentProjectRef !== EXPECTED_PROJECT_REF;
          const base = "border-t";
          const okStyle = "border-slate-800 bg-slate-800/40 text-slate-300";
          const badStyle = "border-red-700 bg-red-600/20 text-red-200";
          const style = `${base} ${mismatch ? badStyle : okStyle}`;
          return (
            <div className={style}>
              <div className="mx-auto w-full max-w-6xl px-4 py-2 text-xs">
                DB: {currentProjectRef ?? "(未設定)"}（envから検出）
                {mismatch ? (
                  <span className="ml-2 font-semibold">
                    Mismatch: 期待値 {EXPECTED_PROJECT_REF}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })()}
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
      </main>
    </div>
  );
}
